<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RecycleBinController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless(
            $request->user()->canManageOperations() || $request->user()->can('recycle_bin.view'),
            403
        );

        $businesses = Business::onlyTrashed()
            ->withCount(['contentItems', 'tasks'])
            ->orderByDesc('deleted_at')
            ->get();

        $tasks = Task::onlyTrashed()
            ->with(['business:id,name', 'owner:id,name'])
            ->orderByDesc('deleted_at')
            ->get();

        $content = ContentItem::onlyTrashed()
            ->with(['business:id,name', 'owner:id,name'])
            ->orderByDesc('deleted_at')
            ->get();

        $invoices = Invoice::onlyTrashed()
            ->with('business:id,name')
            ->orderByDesc('deleted_at')
            ->get();

        $expenses = Expense::onlyTrashed()
            ->with('business:id,name')
            ->orderByDesc('deleted_at')
            ->get();

        $counts = [
            'businesses' => $businesses->count(),
            'tasks' => $tasks->count(),
            'content' => $content->count(),
            'finance' => $invoices->count() + $expenses->count(),
            'invoices' => $invoices->count(),
            'expenses' => $expenses->count(),
            'total' => $businesses->count() + $tasks->count() + $content->count() + $invoices->count() + $expenses->count(),
        ];

        return Inertia::render('recycle-bin/index', [
            'trashed' => [
                'businesses' => $businesses,
                'tasks' => $tasks,
                'content' => $content,
                'invoices' => $invoices,
                'expenses' => $expenses,
            ],
            'counts' => $counts,
            'canManage' => $request->user()->canManageOperations(),
            'isOwner' => $request->user()->isOwner(),
        ]);
    }

    public function restore(Request $request, string $type, int $id): RedirectResponse
    {
        abort_unless(
            $request->user()->canManageOperations() || $request->user()->can('recycle_bin.restore'),
            403
        );

        $model = $this->resolveTrashedModel($type, $id);
        $label = $this->getModelLabel($model);

        DB::transaction(function () use ($model, $type, $id, $request, $label) {
            $model->restore();

            if ($type === 'business' || $type === 'businesses') {
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
            }

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => "{$type}.restored",
                'auditable_type' => get_class($model),
                'auditable_id' => $model->id,
                'metadata' => ['label' => $label, 'type' => $type],
            ]);
        });

        return back()->with('success', "{$label} has been restored from the Recycle Bin.");
    }

    public function forceDelete(Request $request, string $type, int $id): RedirectResponse
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('recycle_bin.force_delete'),
            403
        );

        $model = $this->resolveTrashedModel($type, $id);
        $label = $this->getModelLabel($model);
        $targetId = $model->id;
        $class = get_class($model);

        DB::transaction(function () use ($model, $type, $targetId, $class, $request, $label) {
            if ($type === 'business' || $type === 'businesses') {
                /** @var Business $business */
                $business = $model;
                $business->tasks()->withTrashed()->forceDelete();
                $business->contentItems()->withTrashed()->forceDelete();
                $business->invoices()->withTrashed()->forceDelete();
                $business->expenses()->withTrashed()->forceDelete();
                $business->shootSessions()->delete();
            }

            $model->forceDelete();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => "{$type}.force_deleted",
                'auditable_type' => $class,
                'auditable_id' => $targetId,
                'metadata' => ['label' => $label, 'type' => $type],
            ]);
        });

        return back()->with('success', "{$label} has been permanently deleted.");
    }

    public function restoreAll(Request $request, string $type): RedirectResponse
    {
        abort_unless(
            $request->user()->canManageOperations() || $request->user()->can('recycle_bin.restore'),
            403
        );

        $count = DB::transaction(function () use ($type) {
            if ($type === 'business' || $type === 'businesses') {
                $businesses = Business::onlyTrashed()->get();
                $c = $businesses->count();
                foreach ($businesses as $b) {
                    $b->restore();
                    Task::onlyTrashed()->where('business_id', $b->id)->restore();
                    ContentItem::onlyTrashed()->where('business_id', $b->id)->restore();
                    Invoice::onlyTrashed()->where('business_id', $b->id)->restore();
                    Expense::onlyTrashed()->where('business_id', $b->id)->restore();
                }

                return $c;
            }

            return match ($type) {
                'task', 'tasks' => Task::onlyTrashed()->restore(),
                'content' => ContentItem::onlyTrashed()->restore(),
                'finance' => Invoice::onlyTrashed()->restore() + Expense::onlyTrashed()->restore(),
                'invoice', 'invoices' => Invoice::onlyTrashed()->restore(),
                'expense', 'expenses' => Expense::onlyTrashed()->restore(),
                default => abort(400, "Invalid type {$type}"),
            };
        });

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => "recycle_bin.{$type}_restored_all",
            'auditable_type' => Business::class,
            'auditable_id' => 0,
            'metadata' => ['type' => $type, 'count' => $count],
        ]);

        return back()->with('success', "Restored {$count} items in {$type} from the Recycle Bin.");
    }

    public function emptyTrash(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('recycle_bin.empty'),
            403
        );

        $type = $request->input('type', 'all');
        $count = 0;

        DB::transaction(function () use ($type, &$count) {
            if ($type === 'businesses' || $type === 'business' || $type === 'all') {
                $items = Business::onlyTrashed()->get();
                $count += $items->count();
                foreach ($items as $business) {
                    $business->tasks()->withTrashed()->forceDelete();
                    $business->contentItems()->withTrashed()->forceDelete();
                    $business->invoices()->withTrashed()->forceDelete();
                    $business->expenses()->withTrashed()->forceDelete();
                    $business->shootSessions()->delete();
                    $business->forceDelete();
                }
            }

            if ($type === 'tasks' || $type === 'task' || $type === 'all') {
                $items = Task::onlyTrashed()->get();
                $count += $items->count();
                $items->each->forceDelete();
            }

            if ($type === 'content' || $type === 'all') {
                $items = ContentItem::onlyTrashed()->get();
                $count += $items->count();
                $items->each->forceDelete();
            }

            if ($type === 'finance' || $type === 'all' || $type === 'invoices' || $type === 'invoice') {
                $items = Invoice::onlyTrashed()->get();
                $count += $items->count();
                $items->each->forceDelete();
            }

            if ($type === 'finance' || $type === 'all' || $type === 'expenses' || $type === 'expense') {
                $items = Expense::onlyTrashed()->get();
                $count += $items->count();
                $items->each->forceDelete();
            }
        });

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'recycle_bin.emptied',
            'auditable_type' => Business::class,
            'auditable_id' => 0,
            'metadata' => ['type' => $type, 'count' => $count],
        ]);

        return back()->with('success', "Recycle Bin has been emptied ({$count} items permanently deleted).");
    }

    private function resolveTrashedModel(string $type, int $id): mixed
    {
        return match ($type) {
            'business', 'businesses' => Business::onlyTrashed()->findOrFail($id),
            'task', 'tasks' => Task::onlyTrashed()->findOrFail($id),
            'content' => ContentItem::onlyTrashed()->findOrFail($id),
            'invoice', 'invoices' => Invoice::onlyTrashed()->findOrFail($id),
            'expense', 'expenses' => Expense::onlyTrashed()->findOrFail($id),
            default => abort(404, "Invalid type {$type}"),
        };
    }

    private function getModelLabel(mixed $model): string
    {
        if (isset($model->name)) {
            return (string) $model->name;
        }

        if (isset($model->title)) {
            return (string) $model->title;
        }

        if (isset($model->number)) {
            return 'Invoice '.$model->number;
        }

        if (isset($model->description)) {
            return (string) $model->description;
        }

        return 'Item #'.$model->id;
    }
}
