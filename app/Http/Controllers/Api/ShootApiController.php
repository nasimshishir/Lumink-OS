<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\ShootSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShootApiController extends Controller
{
    /**
     * List shoot sessions with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ShootSession::query()
            ->with(['business:id,name,slug,drive_folder_url', 'owner:id,name'])
            ->whereHas('business');

        if ($request->filled('business_id')) {
            $query->where('business_id', $request->integer('business_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
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
     * Schedule a new shoot session.
     */
    public function store(Request $request): JsonResponse
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
        ]);

        $shoot = ShootSession::create([
            ...$data,
            'owner_id' => $data['owner_id'] ?? $request->user()->id,
            'status' => $data['status'] ?? 'scheduled',
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'shoot.created_via_agent',
            'auditable_type' => ShootSession::class,
            'auditable_id' => $shoot->id,
            'metadata' => ['title' => $shoot->title],
        ]);

        $shoot->load('business:id,name,slug');

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
        $shootSession->load(['business:id,name,slug,drive_folder_url', 'owner:id,name']);

        return response()->json([
            'status' => 'success',
            'data' => $shootSession,
        ]);
    }

    /**
     * Update shoot session (attach Google Drive shots directory, complete status, notes).
     */
    public function update(Request $request, ShootSession $shootSession): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'required', Rule::in(['scheduled', 'completed', 'canceled'])],
            'drive_folder_url' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        $shootSession->update($data);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'shoot.updated_via_agent',
            'auditable_type' => ShootSession::class,
            'auditable_id' => $shootSession->id,
            'metadata' => $data,
        ]);

        $shootSession->load('business:id,name,slug');

        return response()->json([
            'status' => 'success',
            'message' => 'Shoot session updated.',
            'data' => $shootSession,
        ]);
    }
}
