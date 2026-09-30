<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\ShootSession;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShootApiController extends Controller
{
    /**
     * List shoot sessions with optional B-roll tag and text search filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ShootSession::query()
            ->with(['business:id,name,slug,drive_folder_url,drive_folders_map', 'owner:id,name'])
            ->whereHas('business');

        if ($request->filled('business_id')) {
            $query->where('business_id', $request->integer('business_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->boolean('has_footage')) {
            $query->whereNotNull('drive_folder_url');
        }

        if ($request->filled('tag')) {
            $tag = strtolower(trim($request->string('tag')));
            $query->where(function ($q) use ($tag) {
                $q->whereJsonContains('broll_tags', $tag)
                    ->orWhere('footage_summary', 'like', "%{$tag}%")
                    ->orWhere('notes', 'like', "%{$tag}%");
            });
        }

        if ($request->filled('query')) {
            $search = trim($request->string('query'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhere('footage_summary', 'like', "%{$search}%");
            });
        }

        $shoots = $query->orderBy('starts_at', 'desc')->paginate(30);

        return response()->json([
            'status' => 'success',
            'data' => $shoots->items(),
            'pagination' => [
                'current_page' => $shoots->currentPage(),
                'last_page' => $shoots->lastPage(),
                'total' => $shoots->total(),
            ],
        ]);
    }

    /**
     * Schedule a new shoot session and auto-provision its Google Drive shoot folder.
     */
    public function store(Request $request, GoogleDriveService $driveService): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['required', 'exists:businesses,id'],
            'campaign_id' => ['nullable', 'exists:campaigns,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'required', Rule::in(['scheduled', 'completed', 'canceled'])],
            'drive_folder_url' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string'],
            'footage_summary' => ['nullable', 'string'],
            'broll_tags' => ['nullable', 'array'],
            'auto_provision_drive' => ['nullable', 'boolean'],
        ]);

        $brollTags = $data['broll_tags'] ?? null;
        if (empty($brollTags)) {
            // Auto-extract semantic tags from shot list, notes, and title
            $textForTags = trim(implode(' ', array_filter([
                $data['title'] ?? '',
                $data['location'] ?? '',
                $data['notes'] ?? '',
                $data['footage_summary'] ?? '',
            ])));
            $brollTags = ShootSession::extractTagsFromText($textForTags);
        }

        $shoot = ShootSession::create([
            ...$data,
            'owner_id' => $data['owner_id'] ?? $request->user()->id,
            'status' => $data['status'] ?? 'scheduled',
            'broll_tags' => $brollTags,
        ]);

        // Auto-provision Google Drive folder if not explicitly provided
        if (empty($shoot->drive_folder_url) && ($connection = $driveService->getActiveConnection())) {
            $driveService->provisionShootFolder($connection, $shoot);
            $shoot->refresh();
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'shoot.created_via_agent',
            'auditable_type' => ShootSession::class,
            'auditable_id' => $shoot->id,
            'metadata' => ['title' => $shoot->title],
        ]);

        $shoot->load('business:id,name,slug,drive_folder_url,drive_folders_map');

        return response()->json([
            'status' => 'success',
            'message' => 'Shoot session scheduled.',
            'data' => $shoot,
        ], 201);
    }

    /**
     * Get shoot session details.
     */
    public function show(Request $request, ShootSession $shootSession): JsonResponse
    {
        $shootSession->load([
            'business:id,name,slug,drive_folder_url,drive_folders_map',
            'owner:id,name',
            'contentItems:id,title,type,stage,drive_folder_url',
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $shootSession,
        ]);
    }

    /**
     * Update shoot session (attach Google Drive shots directory, complete status, notes, tags).
     */
    public function update(Request $request, ShootSession $shootSession, GoogleDriveService $driveService): JsonResponse
    {
        /** @var array<string, mixed> $data */
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'required', Rule::in(['scheduled', 'completed', 'canceled'])],
            'drive_folder_url' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string'],
            'footage_summary' => ['nullable', 'string'],
            'broll_tags' => ['nullable', 'array'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if (array_key_exists('broll_tags', $data) && empty($data['broll_tags'])) {
            $textForTags = trim(implode(' ', array_filter([
                $data['title'] ?? $shootSession->title,
                $data['location'] ?? $shootSession->location,
                $data['notes'] ?? $shootSession->notes,
                $data['footage_summary'] ?? $shootSession->footage_summary,
            ])));
            $data['broll_tags'] = ShootSession::extractTagsFromText($textForTags);
        }

        $shootSession->update($data);

        // Auto-provision Google Drive folder if still missing and drive connected
        if (empty($shootSession->drive_folder_url) && ($connection = $driveService->getActiveConnection())) {
            $driveService->provisionShootFolder($connection, $shootSession);
            $shootSession->refresh();
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'shoot.updated_via_agent',
            'auditable_type' => ShootSession::class,
            'auditable_id' => $shootSession->id,
            'metadata' => $data,
        ]);

        $shootSession->load('business:id,name,slug,drive_folder_url,drive_folders_map');

        return response()->json([
            'status' => 'success',
            'message' => 'Shoot session updated.',
            'data' => $shootSession,
        ]);
    }
}
