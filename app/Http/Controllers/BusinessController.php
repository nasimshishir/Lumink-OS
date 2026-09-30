<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BusinessController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('viewAny', Business::class), 403);

        return Inertia::render('businesses/index', [
            'businesses' => Business::withCount(['contentItems', 'tasks'])
                ->orderBy('name')
                ->get(),
            'trashedCount' => Business::onlyTrashed()->count(),
            'canManage' => $request->user()->canManageOperations(),
            'isOwner' => $request->user()->isOwner(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create', Business::class), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'primary_contact_name' => ['nullable', 'string', 'max:120'],
            'primary_contact_email' => ['nullable', 'email'],
            'primary_contact_phone' => ['nullable', 'string', 'max:50'],
            'monthly_retainer' => ['required', 'numeric', 'min:0'],
            'agreement_start' => ['nullable', 'date'],
            'deliverable_targets' => ['nullable', 'array'],
        ]);

        $business = Business::create([
            ...$data,
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'platforms' => ['facebook' => '', 'instagram' => '', 'tiktok' => ''],
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'business.created',
            'auditable_type' => Business::class,
            'auditable_id' => $business->id,
            'metadata' => [
                'name' => $business->name,
                'slug' => $business->slug,
            ],
        ]);

        return to_route('businesses.show', $business);
    }

    public function show(Request $request, Business $business): Response
    {
        abort_unless($request->user()->can('view', $business), 403);

        $business->load([
            'campaigns' => fn ($query) => $query->latest('starts_on'),
            'contentItems' => fn ($query) => $query->with('owner:id,name')->orderBy('publish_at'),
            'tasks' => fn ($query) => $query->with('owner:id,name')->where('status', '!=', 'done')->orderBy('due_at'),
            'performancePeriods' => fn ($query) => $query->latest('ends_on')->limit(4),
            'expenses' => fn ($query) => $query
                ->where('allocation_type', 'direct')
                ->whereBetween('spent_on', [now()->startOfMonth(), now()->endOfMonth()]),
        ]);

        $trackedMinutes = $business->tasks()->sum('actual_minutes');
        $directExpenses = (float) $business->expenses->sum('amount');

        return Inertia::render('businesses/show', [
            'business' => $business,
            'users' => User::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'canManage' => $request->user()->canManageOperations(),
            'isOwner' => $request->user()->isOwner(),
            'profitability' => [
                'directExpenses' => $directExpenses,
                'trackedMinutes' => $trackedMinutes,
                'margin' => (float) $business->monthly_retainer - $directExpenses,
            ],
        ]);
    }

    public function update(Request $request, Business $business): RedirectResponse
    {
        abort_unless($request->user()->can('update', $business), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'status' => ['sometimes', 'required', 'in:active,inactive'],
            'primary_contact_name' => ['nullable', 'string', 'max:120'],
            'primary_contact_email' => ['nullable', 'email'],
            'primary_contact_phone' => ['nullable', 'string', 'max:50'],
            'monthly_retainer' => ['sometimes', 'required', 'numeric', 'min:0'],
            'agreement_start' => ['nullable', 'date'],
            'agreement_end' => ['nullable', 'date'],
            'deliverable_targets' => ['nullable', 'array'],
        ]);

        $business->update($data);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'business.updated',
            'auditable_type' => Business::class,
            'auditable_id' => $business->id,
            'metadata' => $data,
        ]);

        return back()->with('success', 'Business workspace updated.');
    }

    public function toggleStatus(Request $request, Business $business): RedirectResponse
    {
        abort_unless($request->user()->can('update', $business), 403);

        $newStatus = $business->status === 'active' ? 'inactive' : 'active';
        $business->update(['status' => $newStatus]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => "business.{$newStatus}",
            'auditable_type' => Business::class,
            'auditable_id' => $business->id,
            'metadata' => [
                'name' => $business->name,
                'slug' => $business->slug,
                'status' => $newStatus,
            ],
        ]);

        $action = $newStatus === 'active' ? 'reactivated' : 'deactivated';

        return back()->with('success', "{$business->name} has been {$action}.");
    }

    public function destroy(Request $request, Business $business): RedirectResponse
    {
        abort_unless($request->user()->can('delete', $business), 403);

        $name = $business->name;
        $id = $business->id;
        $slug = $business->slug;

        DB::transaction(function () use ($business, $request, $name, $id, $slug) {
            $taskIds = $business->tasks()->whereNull('deleted_at')->pluck('id')->all();
            $contentIds = $business->contentItems()->whereNull('deleted_at')->pluck('id')->all();
            $invoiceIds = $business->invoices()->whereNull('deleted_at')->pluck('id')->all();
            $expenseIds = $business->expenses()->whereNull('deleted_at')->pluck('id')->all();

            if (! empty($taskIds)) {
                Task::whereIn('id', $taskIds)->delete();
            }
            if (! empty($contentIds)) {
                ContentItem::whereIn('id', $contentIds)->delete();
            }
            if (! empty($invoiceIds)) {
                Invoice::whereIn('id', $invoiceIds)->delete();
            }
            if (! empty($expenseIds)) {
                Expense::whereIn('id', $expenseIds)->delete();
            }

            $business->delete();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'business.trashed',
                'auditable_type' => Business::class,
                'auditable_id' => $id,
                'metadata' => [
                    'name' => $name,
                    'slug' => $slug,
                    'cascaded_tasks' => $taskIds,
                    'cascaded_content' => $contentIds,
                    'cascaded_invoices' => $invoiceIds,
                    'cascaded_expenses' => $expenseIds,
                ],
            ]);
        });

        return to_route('businesses.index')->with('success', "{$name} moved to the Recycle Bin.");
    }

    public function restore(Request $request, int $id): RedirectResponse
    {
        $business = Business::onlyTrashed()->findOrFail($id);
        abort_unless($request->user()->can('restore', $business), 403);

        DB::transaction(function () use ($business, $request, $id) {
            $business->restore();

            $lastTrashedEvent = AuditEvent::where('auditable_type', Business::class)
                ->where('auditable_id', $id)
                ->where('event', 'business.trashed')
                ->latest()
                ->first();

            $metadata = $lastTrashedEvent?->metadata ?? [];
            $taskIds = $metadata['cascaded_tasks'] ?? null;
            $contentIds = $metadata['cascaded_content'] ?? null;
            $invoiceIds = $metadata['cascaded_invoices'] ?? null;
            $expenseIds = $metadata['cascaded_expenses'] ?? null;

            if (is_array($taskIds) && ! empty($taskIds)) {
                Task::onlyTrashed()->whereIn('id', $taskIds)->restore();
            } else {
                Task::onlyTrashed()->where('business_id', $id)->restore();
            }

            if (is_array($contentIds) && ! empty($contentIds)) {
                ContentItem::onlyTrashed()->whereIn('id', $contentIds)->restore();
            } else {
                ContentItem::onlyTrashed()->where('business_id', $id)->restore();
            }

            if (is_array($invoiceIds) && ! empty($invoiceIds)) {
                Invoice::onlyTrashed()->whereIn('id', $invoiceIds)->restore();
            } else {
                Invoice::onlyTrashed()->where('business_id', $id)->restore();
            }

            if (is_array($expenseIds) && ! empty($expenseIds)) {
                Expense::onlyTrashed()->whereIn('id', $expenseIds)->restore();
            } else {
                Expense::onlyTrashed()->where('business_id', $id)->restore();
            }

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'business.restored',
                'auditable_type' => Business::class,
                'auditable_id' => $business->id,
                'metadata' => [
                    'name' => $business->name,
                    'slug' => $business->slug,
                ],
            ]);
        });

        return back()->with('success', "{$business->name} has been restored from the Recycle Bin.");
    }

    public function forceDelete(Request $request, int $id): RedirectResponse
    {
        $business = Business::withTrashed()->findOrFail($id);
        abort_unless($request->user()->can('forceDelete', $business), 403);

        $name = $business->name;
        $slug = $business->slug;

        DB::transaction(function () use ($business, $request, $id, $name, $slug) {
            $business->tasks()->withTrashed()->forceDelete();
            $business->contentItems()->withTrashed()->forceDelete();
            $business->invoices()->withTrashed()->forceDelete();
            $business->expenses()->withTrashed()->forceDelete();
            $business->shootSessions()->delete();

            $business->forceDelete();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'business.force_deleted',
                'auditable_type' => Business::class,
                'auditable_id' => $id,
                'metadata' => [
                    'name' => $name,
                    'slug' => $slug,
                ],
            ]);
        });

        return to_route('businesses.index')->with('success', "{$name} has been permanently deleted.");
    }

    public function emptyTrash(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isOwner(), 403);

        $trashed = Business::onlyTrashed()->get();
        $count = $trashed->count();

        DB::transaction(function () use ($trashed) {
            foreach ($trashed as $business) {
                $business->tasks()->withTrashed()->forceDelete();
                $business->contentItems()->withTrashed()->forceDelete();
                $business->invoices()->withTrashed()->forceDelete();
                $business->expenses()->withTrashed()->forceDelete();
                $business->shootSessions()->delete();
                $business->forceDelete();
            }
        });

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'business.recycle_bin_emptied',
            'auditable_type' => Business::class,
            'auditable_id' => 0,
            'metadata' => [
                'count' => $count,
            ],
        ]);

        return back()->with('success', "Recycle Bin has been emptied ({$count} businesses permanently deleted).");
    }
}
