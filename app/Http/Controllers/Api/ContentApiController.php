<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\ContentInspiration;
use App\Models\ContentItem;
use App\Models\ShootSession;
use App\Models\Task;
use App\Models\User;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
     * Create a new content deliverable (and optional initial tasks and inspirations).
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
            'type' => ['sometimes', 'required', 'string', 'in:reel,static,carousel,story,cinematic,video,photo,post'],
            'stage' => ['sometimes', 'required', 'string', Rule::in(ContentItem::STAGES)],
            'priority' => ['sometimes', 'required', 'string', 'in:low,medium,high'],
            'brief' => ['nullable', 'string'],
            'hook' => ['nullable', 'string'],
            'script' => ['nullable', 'string'],
            'cta' => ['nullable', 'string'],
            'target_audience' => ['nullable', 'string'],
            'featured_items' => ['nullable', 'array'],
            'shoot_notes' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string', 'max:1000'],
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
            'inspirations' => ['nullable'],
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
        $rawInspirations = $data['inspirations'] ?? [];
        if (! is_array($rawInspirations)) {
            $rawInspirations = $rawInspirations ? [$rawInspirations] : [];
        } elseif (! empty($rawInspirations) && ! array_is_list($rawInspirations)) {
            $rawInspirations = [$rawInspirations];
        }

        unset($data['tasks'], $data['inspirations'], $data['auto_provision_drive']);

        $user = $request->user();
        $userId = $user instanceof User ? $user->id : null;

        /** @var ContentItem $contentItem */
        $contentItem = DB::transaction(function () use ($data, $tasksData, $rawInspirations, $userId) {
            $contentItem = ContentItem::create([
                ...$data,
                'owner_id' => $data['owner_id'] ?? $userId,
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
                    'created_by' => $userId,
                ]);
            }

            foreach ($rawInspirations as $index => $iData) {
                if (! empty($iData)) {
                    $contentItem->attachInspiration($iData, $userId, $index);
                }
            }

            AuditEvent::create([
                'user_id' => $userId,
                'event' => 'content.created_via_agent',
                'auditable_type' => ContentItem::class,
                'auditable_id' => $contentItem->id,
                'metadata' => [
                    'title' => $contentItem->title,
                    'tasks_count' => count($tasksData),
                    'inspirations_count' => count($rawInspirations),
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
            'inspirations.user:id,name,avatar',
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
            'proofs.user:id,name,avatar',
            'inspirations.user:id,name,avatar',
        ]);

        $responseData = $contentItem->toArray();
        $responseData['referenced_shoots'] = $contentItem->referencedShoots();

        return response()->json([
            'status' => 'success',
            'data' => $responseData,
        ]);
    }

    /**
     * Update content deliverable details, advance stage, attach Drive shot directory, or append inspirations.
     */
    public function update(Request $request, ContentItem $contentItem, GoogleDriveService $driveService): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is in Recycle Bin.');

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'in:reel,static,carousel,story,cinematic,video,photo,post'],
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
            'thumbnail_url' => ['nullable', 'string', 'max:1000'],
            'drive_folder_url' => ['nullable', 'string', 'max:1000'],
            'raw_footage_url' => ['nullable', 'string', 'max:1000'],
            'final_asset_url' => ['nullable', 'string', 'max:1000'],
            'publish_at' => ['nullable', 'date'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'inspirations' => ['nullable'],
            'replace_inspirations' => ['nullable', 'boolean'],
        ]);

        // Inherit primary shoot's drive folder if provided and not explicitly set
        if (! empty($data['primary_shoot_id']) && empty($data['drive_folder_url']) && empty($contentItem->drive_folder_url)) {
            $primaryShoot = ShootSession::query()->find($data['primary_shoot_id']);
            if ($primaryShoot instanceof ShootSession && $primaryShoot->drive_folder_url) {
                $data['drive_folder_url'] = $primaryShoot->drive_folder_url;
            }
        }

        $user = $request->user();
        $userId = $user instanceof User ? $user->id : null;

        $hasInspirations = array_key_exists('inspirations', $data);
        $rawInspirations = $data['inspirations'] ?? [];
        $replaceInspirations = (bool) ($data['replace_inspirations'] ?? false);
        unset($data['inspirations'], $data['replace_inspirations']);

        $oldStage = $contentItem->stage;
        $contentItem->update($data);

        if ($hasInspirations) {
            if (! is_array($rawInspirations)) {
                $rawInspirations = $rawInspirations ? [$rawInspirations] : [];
            } elseif (! empty($rawInspirations) && ! array_is_list($rawInspirations)) {
                $rawInspirations = [$rawInspirations];
            }

            if ($replaceInspirations) {
                $contentItem->inspirations()->delete();
                $currentCount = 0;
            } else {
                $currentCount = $contentItem->inspirations()->count();
            }

            foreach ($rawInspirations as $index => $iData) {
                if (! empty($iData)) {
                    $contentItem->attachInspiration($iData, $userId, $currentCount + $index);
                }
            }
        }

        AuditEvent::create([
            'user_id' => $userId,
            'event' => 'content.updated_via_agent',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => [
                'updated_fields' => array_keys($data),
                'stage_change' => isset($data['stage']) && $data['stage'] !== $oldStage ? ['from' => $oldStage, 'to' => $data['stage']] : null,
                'inspirations_added' => $hasInspirations ? count($rawInspirations) : 0,
            ],
        ]);

        $contentItem->load([
            'tasks',
            'business:id,name,slug,drive_folder_url',
            'primaryShoot:id,title,starts_at,location,drive_folder_url,broll_tags',
            'inspirations.user:id,name,avatar',
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
     * List all inspiration references for a content deliverable.
     */
    public function listInspirations(Request $request, ContentItem $contentItem): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is in Recycle Bin.');

        $inspirations = $contentItem->inspirations()
            ->with('user:id,name,avatar')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $inspirations,
        ]);
    }

    /**
     * Add one or more inspiration references to a content deliverable.
     */
    public function addInspiration(Request $request, ContentItem $contentItem): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is in Recycle Bin.');

        $user = $request->user();
        $userId = $user instanceof User ? $user->id : null;

        $rawItems = [];
        if ($request->has('inspirations')) {
            $input = $request->input('inspirations');
            $rawItems = is_array($input) ? $input : [$input];
        } else {
            /** @var array<mixed> $all */
            $all = $request->all();
            if (array_is_list($all)) {
                $rawItems = $all;
            } else {
                $rawItems = [$all];
            }
        }

        $created = [];
        $currentCount = $contentItem->inspirations()->count();

        foreach ($rawItems as $index => $item) {
            if (! empty($item)) {
                $inspiration = $contentItem->attachInspiration($item, $userId, $currentCount + $index);
                if ($inspiration) {
                    $inspiration->load('user:id,name,avatar');
                    $created[] = $inspiration;
                }
            }
        }

        AuditEvent::create([
            'user_id' => $userId,
            'event' => 'content.inspirations_added_via_agent',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => [
                'added_count' => count($created),
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => count($created).' inspiration reference(s) saved.',
            'data' => $created,
        ], 201);
    }

    /**
     * Delete an inspiration reference from a content deliverable.
     */
    public function deleteInspiration(Request $request, ContentItem $contentItem, ContentInspiration $inspiration): JsonResponse
    {
        abort_if($contentItem->trashed(), 404, 'Content deliverable is in Recycle Bin.');
        abort_unless($inspiration->content_item_id === $contentItem->id, 404, 'Inspiration does not belong to this content item.');

        if ($inspiration->image_path) {
            Storage::disk('public')->delete($inspiration->image_path);
        }

        $user = $request->user();
        $userId = $user instanceof User ? $user->id : null;

        $title = $inspiration->title;
        $inspiration->delete();

        AuditEvent::create([
            'user_id' => $userId,
            'event' => 'content.inspiration_deleted_via_agent',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => [
                'title' => $title,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Inspiration reference removed.',
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

        $user = $request->user();
        $userId = $user instanceof User ? $user->id : null;

        AuditEvent::create([
            'user_id' => $userId,
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
