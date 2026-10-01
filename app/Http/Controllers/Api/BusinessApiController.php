<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessApiController extends Controller
{
    /**
     * List active client business workspaces with deliverable targets and drive folders.
     */
    public function index(Request $request): JsonResponse
    {
        $businesses = Business::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'status',
                'industry',
                'monthly_retainer',
                'drive_folder_id',
                'drive_folder_url',
                'drive_folders_map',
                'deliverable_targets',
                'brand_profile',
                'approval_deadline_hours',
                'revision_limit',
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $businesses,
        ]);
    }

    /**
     * Get detailed business workspace with campaigns, current deliverables, and tasks.
     */
    public function show(Request $request, Business $business): JsonResponse
    {
        abort_if($business->trashed(), 404, 'Business is in Recycle Bin.');

        $business->load([
            'campaigns' => fn ($q) => $q->where('status', 'active')->latest()->limit(5),
            'contentItems' => fn ($q) => $q->whereNotIn('stage', ['published'])->latest()->limit(10),
            'tasks' => fn ($q) => $q->where('status', '!=', 'done')->latest()->limit(10),
            'shootSessions' => fn ($q) => $q->where('starts_at', '>=', now()->subDays(7))->latest()->limit(5),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $business,
        ]);
    }

    /**
     * Update monthly deliverable targets for a business workspace.
     * Restricted to owners and managers.
     */
    public function updateTargets(Request $request, Business $business): JsonResponse
    {
        abort_unless($request->user()->canManageOperations(), 403, 'Only owners and managers can update delivery targets.');
        abort_if($business->trashed(), 404, 'Business is in Recycle Bin.');

        $data = $request->validate([
            'deliverable_targets' => ['required', 'array'],
            'deliverable_targets.reels' => ['sometimes', 'integer', 'min:0'],
            'deliverable_targets.stories' => ['sometimes', 'integer', 'min:0'],
            'deliverable_targets.static' => ['sometimes', 'integer', 'min:0'],
            'deliverable_targets.shoots' => ['sometimes', 'integer', 'min:0'],
        ]);

        $business->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Delivery targets updated.',
            'data' => [
                'id' => $business->id,
                'name' => $business->name,
                'deliverable_targets' => $business->deliverable_targets,
            ],
        ]);
    }
}
