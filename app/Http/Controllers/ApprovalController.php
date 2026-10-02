<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use App\Models\ApprovalResponse;
use App\Models\AuditEvent;
use App\Models\Business;
use App\Models\ContentItem;
use App\Notifications\ApprovalResponded;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function store(Request $request, ContentItem $contentItem): RedirectResponse
    {
        abort_unless($request->user()->canManageOperations(), 403);

        $approval = DB::transaction(function () use ($request, $contentItem): ApprovalRequest {
            $contentItem->approvals()
                ->whereNull('responded_at')
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);

            $contentItem->update(['stage' => 'client_review']);

            return ApprovalRequest::create([
                'content_item_id' => $contentItem->id,
                'created_by' => $request->user()->id,
                'token' => Str::random(48),
                'version' => $contentItem->revision_number,
                'expires_at' => now()->addDays(4),
            ]);
        });

        return back()->with('approval_url', route('approvals.show', $approval->token));
    }

    public function show(string $token): Response
    {
        $approval = ApprovalRequest::where('token', $token)
            ->with('contentItem.business:id,name,logo_url')
            ->firstOrFail();

        abort_if($approval->revoked_at !== null || $approval->expires_at->isPast(), 410, 'This approval link has expired.');
        $approval->makeVisible('token');

        return Inertia::render('approval/show', ['approval' => $approval]);
    }

    public function respond(Request $request, string $token): RedirectResponse
    {
        $approval = ApprovalRequest::where('token', $token)->firstOrFail();
        abort_if($approval->revoked_at !== null || $approval->expires_at->isPast(), 410);
        abort_if($approval->responded_at !== null, 409, 'This approval request has already been completed.');

        $data = $request->validate([
            'client_name' => ['required', 'string', 'max:120'],
            'action' => ['required', 'in:approved,changes_requested'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        [$approval, $response] = DB::transaction(function () use ($approval, $data, $request): array {
            $lockedApproval = ApprovalRequest::query()
                ->with('contentItem')
                ->lockForUpdate()
                ->findOrFail($approval->id);

            abort_if($lockedApproval->responded_at !== null, 409, 'This approval request has already been completed.');
            abort_if(
                $lockedApproval->contentItem->revision_number !== $lockedApproval->version,
                409,
                'This content version has changed. Ask Lumink for a new approval link.',
            );

            $response = ApprovalResponse::create([
                ...$data,
                'approval_request_id' => $lockedApproval->id,
                'ip_address' => $request->ip(),
            ]);

            $lockedApproval->update([
                'status' => $data['action'],
                'responded_at' => now(),
            ]);

            $lockedApproval->contentItem->update([
                'stage' => $data['action'] === 'approved' ? 'approved' : 'editing',
                'revision_number' => $data['action'] === 'approved'
                    ? $lockedApproval->contentItem->revision_number
                    : $lockedApproval->contentItem->revision_number + 1,
            ]);

            AuditEvent::create([
                'event' => 'approval.responded',
                'auditable_type' => ApprovalRequest::class,
                'auditable_id' => $lockedApproval->id,
                'metadata' => $data,
            ]);

            return [$lockedApproval, $response];
        });

        // Notify content owner and approval creator
        $contentItem = $approval->contentItem;
        $usersToNotify = collect();
        if ($contentItem->owner_id) {
            $usersToNotify->push($contentItem->owner);
        }
        if ($approval->created_by) {
            $usersToNotify->push($approval->creator);
        }

        $usersToNotify->filter()->unique('id')->each(function ($user) use ($approval, $response) {
            $user->notify(new ApprovalResponded($approval, $response));
        });

        return back()->with('success', 'Your response has been recorded.');
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isClient = $user->isClient();

        $contentQuery = ContentItem::query()
            ->with([
                'business:id,name,logo_url,industry',
                'owner:id,name,avatar',
                'approvals' => fn ($q) => $q->with('responses')->latest(),
            ])
            ->whereHas('business');

        if ($isClient) {
            abort_unless($user->business_id !== null, 403, 'Your client account is not assigned to any business.');
            $contentQuery->where('business_id', $user->business_id);
        }

        // 1. Pending client review deliverables
        $pendingItems = (clone $contentQuery)
            ->where('stage', 'client_review')
            ->orderByDesc('updated_at')
            ->get();

        $pendingItems->each(function ($item) {
            $item->approvals->makeVisible('token');
        });

        // 2. Approved archive deliverables
        $approvedItems = (clone $contentQuery)
            ->whereIn('stage', ['approved', 'scheduled', 'published'])
            ->orderByDesc('updated_at')
            ->limit(30)
            ->get();

        $business = $isClient && $user->business_id
            ? Business::find($user->business_id)
            : null;

        return Inertia::render('approval/index', [
            'pendingItems' => $pendingItems,
            'approvedItems' => $approvedItems,
            'business' => $business,
            'isClient' => $isClient,
        ]);
    }

    public function respondAuthenticated(Request $request, ContentItem $contentItem): RedirectResponse
    {
        $user = $request->user();

        if ($user->isClient()) {
            abort_unless(
                $user->business_id === $contentItem->business_id,
                403,
                'You can only review content for your assigned business.'
            );
        } else {
            abort_unless($user->canManageOperations(), 403);
        }

        abort_unless(
            $contentItem->stage === 'client_review',
            422,
            'This deliverable is not currently awaiting client approval.'
        );

        $data = $request->validate([
            'action' => ['required', 'in:approved,changes_requested'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $approval = $contentItem->approvals()
            ->whereNull('responded_at')
            ->whereNull('revoked_at')
            ->latest()
            ->first();

        if (! $approval) {
            $approval = ApprovalRequest::create([
                'content_item_id' => $contentItem->id,
                'created_by' => $user->id,
                'token' => Str::random(48),
                'version' => $contentItem->revision_number,
                'expires_at' => now()->addDays(7),
            ]);
        }

        [$approval, $response] = DB::transaction(function () use ($approval, $data, $request, $user): array {
            $lockedApproval = ApprovalRequest::query()
                ->with('contentItem')
                ->lockForUpdate()
                ->findOrFail($approval->id);

            $response = ApprovalResponse::create([
                'approval_request_id' => $lockedApproval->id,
                'client_name' => $user->name,
                'action' => $data['action'],
                'comment' => $data['comment'] ?? null,
                'ip_address' => $request->ip(),
            ]);

            $lockedApproval->update([
                'status' => $data['action'],
                'responded_at' => now(),
            ]);

            $lockedApproval->contentItem->update([
                'stage' => $data['action'] === 'approved' ? 'approved' : 'editing',
                'revision_number' => $data['action'] === 'approved'
                    ? $lockedApproval->contentItem->revision_number
                    : $lockedApproval->contentItem->revision_number + 1,
            ]);

            AuditEvent::create([
                'user_id' => $user->id,
                'event' => 'approval.responded',
                'auditable_type' => ApprovalRequest::class,
                'auditable_id' => $lockedApproval->id,
                'metadata' => [
                    ...$data,
                    'client_name' => $user->name,
                    'user_id' => $user->id,
                ],
            ]);

            return [$lockedApproval, $response];
        });

        // Notify content owner and creator
        $item = $approval->contentItem;
        $usersToNotify = collect();
        if ($item->owner_id) {
            $usersToNotify->push($item->owner);
        }
        if ($approval->created_by && $approval->created_by !== $user->id) {
            $usersToNotify->push($approval->creator);
        }

        $usersToNotify->filter()->unique('id')->each(function ($u) use ($approval, $response) {
            $u->notify(new ApprovalResponded($approval, $response));
        });

        $message = $data['action'] === 'approved'
            ? 'Deliverable successfully approved!'
            : 'Changes requested. The creative team has been notified.';

        return back()->with('success', $message);
    }
}
