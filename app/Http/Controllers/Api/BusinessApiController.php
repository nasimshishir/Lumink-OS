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
}
