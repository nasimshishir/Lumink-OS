<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $now = now();
        $user = $request->user();
        $canManageOperations = $user->canManageOperations();
        $tasks = Task::query()
            ->with(['business:id,name,slug', 'owner:id,name,avatar', 'contentItem:id,title'])
            ->when(! $canManageOperations, fn ($query) => $query->where('owner_id', $user->id))
            ->where('status', '!=', 'done')
            ->orderByRaw('due_at is null, due_at asc')
            ->limit(20)
            ->get();

        $visibleContent = fn ($query) => $query->when(
            ! $canManageOperations,
            fn ($query) => $query->where(fn ($query) => $query
                ->where('owner_id', $user->id)
                ->orWhereHas('tasks', fn ($query) => $query->where('owner_id', $user->id))),
        );

        $finance = null;
        if ($user->isOwner()) {
            $invoices = Invoice::with(['business:id,name', 'payments'])
                ->whereIn('status', ['sent', 'partial', 'overdue'])
                ->get();
            $directCosts = Expense::where('allocation_type', 'direct')
                ->whereBetween('spent_on', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])
                ->sum('amount');
            $revenue = Business::where('status', 'active')->sum('monthly_retainer');

            $finance = [
                'revenue' => (float) $revenue,
                'directCosts' => (float) $directCosts,
                'outstanding' => (float) $invoices->sum(fn (Invoice $invoice) => $invoice->balance),
                'hiringThreshold' => 80000,
            ];
        }

        return Inertia::render('today', [
            'tasks' => $tasks,
            'summary' => [
                'attention' => $tasks->filter(fn (Task $task) => ($task->due_at?->isPast() ?? false) || $task->priority === 'high')->count(),
                'today' => $tasks->filter(fn (Task $task) => $task->due_at?->isToday() ?? false)->count(),
                'week' => $tasks->filter(fn (Task $task) => $task->due_at?->between($now, $now->copy()->endOfWeek()) ?? false)->count(),
                'completed' => Task::where('status', 'done')
                    ->when(! $canManageOperations, fn ($query) => $query->where('owner_id', $user->id))
                    ->whereDate('updated_at', $now)
                    ->count(),
            ],
            'contentProgress' => collect(ContentItem::STAGES)->mapWithKeys(
                fn (string $stage) => [$stage => $visibleContent(ContentItem::query())->where('stage', $stage)->count()],
            ),
            'activeContent' => $visibleContent(ContentItem::with(['business:id,name,slug', 'owner:id,name']))
                ->whereNotIn('stage', ['published'])
                ->orderBy('publish_at')
                ->limit(6)
                ->get(),
            'finance' => $finance,
            'activity' => AuditEvent::query()
                ->when(! $canManageOperations, fn ($query) => $query->where('user_id', $user->id))
                ->latest()
                ->limit(5)
                ->get(),
            'businesses' => $canManageOperations ? Business::orderBy('name')->get(['id', 'name']) : [],
            'users' => $canManageOperations ? User::where('is_active', true)->orderBy('name')->get(['id', 'name']) : [],
            'canCreateTasks' => $user->can('create', Task::class),
        ]);
    }
}
