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
        $tasks = Task::query()
            ->with(['business:id,name,slug', 'owner:id,name,avatar', 'contentItem:id,title'])
            ->when($request->user()->role === 'specialist', fn ($query) => $query->where('owner_id', $request->user()->id))
            ->where('status', '!=', 'done')
            ->orderByRaw('due_at is null, due_at asc')
            ->limit(20)
            ->get();

        $invoices = Invoice::with(['business:id,name', 'payments'])
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->get();

        $directCosts = Expense::where('allocation_type', 'direct')
            ->whereBetween('spent_on', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])
            ->sum('amount');

        $revenue = Business::where('status', 'active')->sum('monthly_retainer');
        $outstanding = $invoices->sum(fn (Invoice $invoice) => $invoice->balance);

        return Inertia::render('today', [
            'tasks' => $tasks,
            'summary' => [
                'attention' => $tasks->filter(fn (Task $task) => $task->due_at?->isPast() || $task->priority === 'high')->count(),
                'today' => $tasks->filter(fn (Task $task) => $task->due_at?->isToday())->count(),
                'week' => $tasks->filter(fn (Task $task) => $task->due_at?->between($now, $now->copy()->endOfWeek()))->count(),
                'completed' => Task::where('status', 'done')->whereDate('updated_at', $now)->count(),
            ],
            'contentProgress' => collect(ContentItem::STAGES)->mapWithKeys(
                fn (string $stage) => [$stage => ContentItem::where('stage', $stage)->count()],
            ),
            'activeContent' => ContentItem::with(['business:id,name,slug', 'owner:id,name'])
                ->whereNotIn('stage', ['published'])
                ->orderBy('publish_at')
                ->limit(6)
                ->get(),
            'finance' => [
                'revenue' => (float) $revenue,
                'directCosts' => (float) $directCosts,
                'outstanding' => (float) $outstanding,
                'hiringThreshold' => 80000,
            ],
            'activity' => AuditEvent::latest()->limit(5)->get(),
            'businesses' => Business::orderBy('name')->get(['id', 'name']),
            'users' => User::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
