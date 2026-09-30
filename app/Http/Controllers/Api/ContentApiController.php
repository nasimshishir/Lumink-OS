<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\ContentItem;
use App\Models\ShootSession;
use App\Models\Task;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContentApiController extends Controller
{
    /**
     * List content deliverables with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ContentItem::query()
            ->with([
                'business:id,name,slug,drive_folder_url',
                'owner:id,name',
                'primaryShoot:id,title,starts_at,location,drive_folder_url',
                'tasks:id,content_item_id,title,status,priority,due_at',
            ])
            ->whereHas('business');

        if ($request->filled('business_id')) {
            $query->where('business_id', $request->integer('business_id'));
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->string('stage'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('shoot_id')) {
            $shootId = $request->integer('shoot_id');
            $query->where(function ($q) use ($shootId) {
                $q->where('primary_shoot_id', $shootId)
                    ->orWhereJsonContains('referenced_shoot_ids', $shootId);
            });
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where('title', 'like', "%{$search}%");
        }

        $items = $query->orderBy('created_at', 'desc')->paginate(30);

        return response()->json([
            'status' => 'success',
            'data' => $items->items(),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    /**
     * Create a new content deliverable (and optional initial tasks).
     */
    public function store(Request $request, GoogleDriveService $driveService): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['required', 'exists:businesses,id'],
            'campaign_id' => ['nullable', 'exists:campaigns,id'],
            'primary_shoot_id' => ['nullable', 'exists:shoot_sessions,id'],
            'referenced_shoot_ids' => ['nullable', 'array'],
            'referenced_shoot_ids.*' => ['integer', 'exists:shoot_sessions,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'in:reel,carousel,video,photo,story,post'],
            'stage' => ['sometimes', 'required', 'string', Rule::in(ContentItem::STAGES)],
            'priority' => ['sometimes', 'required', 'string', 'in:low,medium,high'],
            'brief' => ['nullable', 'string'],
            'hook' => ['nullable', 'string'],
            'script' => ['nullable', 'string'],
            'cta' => ['nullable', 'string'],
            'target_audience' => ['nullable', 'string'],
            'featured_items' => ['nullable', 'array'],
            'shoot_notes' => ['nullable', 'string'],
            'drive_folder_url' => ['nullable', 'string', 'max:1000'],
            'raw_footage_url' => ['nullable', 'string', 'max:1000'],
            'final_asset_url' => ['nullable', 'string', 'max:1000'],
            'publish_at' => ['nullable', 'date'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'tasks' => ['nullable', 'array'],
            'tasks.*.title' => ['required_with:tasks', 'string', 'max:180'],
            'tasks.*.type' => ['nullable', 'string', 'max:50'],
            'tasks.*.priority' => ['nullable', 'string', 'in:low,medium,high'],
            'tasks.*.due_at' => ['nullable', 'date'],
            'tasks.*.estimate_minutes' => ['nullable', 'integer', 'min:0'],
            'tasks.*.description' => ['nullable', 'string'],
            'auto_provision_drive' => ['nullable', 'boolean'],
        ]);

        // If primary shoot specified and drive_folder_url not explicitly provided, inherit shoot's drive folder
        if (! empty($data['primary_shoot_id']) && empty($data['drive_folder_url'])) {
            $primaryShoot = ShootSession::query()->find($data['primary_shoot_id']);
            if ($primaryShoot instanceof ShootSession && $primaryShoot->drive_folder_url) {
                $data['drive_folder_url'] = $primaryShoot->drive_folder_url;
            }
        }

        $tasksData = $data['tasks'] ?? [];
        unset($data['tasks'], $data['auto_provision_drive']);

        $user = $request->user();

        /** @var ContentItem $contentItem */
        $contentItem = DB::transaction(function () use ($data, $tasksData, $user) {
            $contentItem = ContentItem::create([
                ...$data,
                'owner_id' => $data['owner_id'] ?? $user->id,
            ]);

            foreach ($tasksData as $tData) {
                Task::create([
                    'business_id' => $contentItem->business_id,
                    'content_item_id' => $contentItem->id,
                    'title' => $tData['title'],
                    'type' => $tData['type'] ?? 'content',
                    'priority' => $tData['priority'] ?? $contentItem->priority,
                    'status' => 'todo',
                    'due_at' => $tData['due_at'] ?? $contentItem->publish_at,
                    'estimate_minutes' => $tData['estimate_minutes'] ?? 0,
                    'description' => $tData['description'] ?? null,
                    'owner_id' => $contentItem->owner_id,
                    'created_by' => $user->id,
                ]);
            }

            AuditEvent::create([
                'user_id' => $user->id,
                'event' => 'content.created_via_agent',
                'auditable_type' => ContentItem::class,
                'auditable_id' => $contentItem->id,
                'metadata' => [
                    'title' => $contentItem->title,
                    'tasks_count' => count($tasksData),
                    'primary_shoot_id' => $contentItem->primary_shoot_id,
                    'referenced_shoots_count' => count($contentItem->referenced_shoot_ids ?? []),
                ],
            ]);

            return $contentItem;
        });

        // Auto-provision dedicated folder in Google Drive if content needs its own directory
        if (empty($contentItem->drive_folder_url) && ($connection = $driveService->getActiveConnection())) {
            $driveService->provisionContentFolder($connection, $contentItem);
            $contentItem->refresh();
        }

        $contentItem->load([
            'tasks',
            'business:id,name,slug,drive_folder_url',
            'primaryShoot:id,title,starts_at,location,drive_folder_url,broll_tags',
        ]);

        $responseData = $contentItem->toArray();
        $responseData['referenced_shoots'] = $contentItem->referencedShoots();

        return response()->json([
            'status' => 'success',
            'message' => 'Content deliverable and tasks successfully planned.',
            'data' => $responseData,
        ], 201);
    }

    /**
     * Get specific content deliverable with sub-tasks, footage pipeline, and drive links.
     */
    public function show(Request $request, ContentItem $contentItem): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is in Recycle Bin.');

        $contentItem->load([
            'business:id,name,slug,drive_folder_url,drive_folders_map',
            'owner:id,name,avatar',
            'primaryShoot:id,title,starts_at,location,drive_folder_url,broll_tags,footage_summary',
            'tasks' => fn ($q) => $q->orderBy('due_at'),
            'approvals',
        ]);

        $responseData = $contentItem->toArray();
        $responseData['referenced_shoots'] = $contentItem->referencedShoots();

        return response()->json([
            'status' => 'success',
            'data' => $responseData,
        ]);
    }

    /**
     * Update content deliverable details, advance stage, or attach Drive shot directory / asset URLs.
     */
    public function update(Request $request, ContentItem $contentItem, GoogleDriveService $driveService): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is in Recycle Bin.');

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'in:reel,carousel,video,photo,story,post'],
            'stage' => ['sometimes', 'required', 'string', Rule::in(ContentItem::STAGES)],
            'priority' => ['sometimes', 'required', 'string', 'in:low,medium,high'],
            'primary_shoot_id' => ['nullable', 'exists:shoot_sessions,id'],
            'referenced_shoot_ids' => ['nullable', 'array'],
            'referenced_shoot_ids.*' => ['integer', 'exists:shoot_sessions,id'],
            'brief' => ['nullable', 'string'],
            'hook' => ['nullable', 'string'],
            'script' => ['nullable', 'string'],
            'cta' => ['nullable', 'string'],
            'target_audience' => ['nullable', 'string'],
            'featured_items' => ['nullable', 'array'],
            'shoot_notes' => ['nullable', 'string'],
            'drive_folder_url' => ['nullable', 'string', 'max:1000'],
            'raw_footage_url' => ['nullable', 'string', 'max:1000'],
            'final_asset_url' => ['nullable', 'string', 'max:1000'],
            'publish_at' => ['nullable', 'date'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        // Inherit primary shoot's drive folder if provided and not explicitly set
        if (! empty($data['primary_shoot_id']) && empty($data['drive_folder_url']) && empty($contentItem->drive_folder_url)) {
            $primaryShoot = ShootSession::query()->find($data['primary_shoot_id']);
            if ($primaryShoot instanceof ShootSession && $primaryShoot->drive_folder_url) {
                $data['drive_folder_url'] = $primaryShoot->drive_folder_url;
            }
        }

        $oldStage = $contentItem->stage;
        $contentItem->update($data);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'content.updated_via_agent',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => [
                'updated_fields' => array_keys($data),
                'stage_change' => isset($data['stage']) && $data['stage'] !== $oldStage ? ['from' => $oldStage, 'to' => $data['stage']] : null,
            ],
        ]);

        $contentItem->load([
            'tasks',
            'business:id,name,slug,drive_folder_url',
            'primaryShoot:id,title,starts_at,location,drive_folder_url,broll_tags',
        ]);

        $responseData = $contentItem->toArray();
        $responseData['referenced_shoots'] = $contentItem->referencedShoots();

        return response()->json([
            'status' => 'success',
            'message' => 'Content deliverable updated.',
            'data' => $responseData,
        ]);
    }

    /**
     * Soft delete content deliverable.
     */
    public function destroy(Request $request, ContentItem $contentItem): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is already in Recycle Bin.');

        $title = $contentItem->title;
        $contentItem->delete();

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'content.trashed_via_agent',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => ['title' => $title],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Content deliverable '{$title}' moved to Recycle Bin.",
        ]);
    }
}
