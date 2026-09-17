<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\Expense;
use App\Models\Invoice;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function __invoke(): Response
    {
        $periodStart = now()->startOfMonth();
        $periodEnd = now()->endOfMonth();
        $invoices = Invoice::with(['business:id,name,slug', 'lines', 'payments'])
            ->latest('issue_date')
            ->get()
            ->each(function (Invoice $invoice) {
                $invoice->append(['paid_amount', 'balance', 'effective_status']);
            });

        $expenses = Expense::with('business:id,name')
            ->latest('spent_on')
            ->get();

        $businesses = Business::with([
            'expenses' => fn ($query) => $query
                ->where('allocation_type', 'direct')
                ->whereBetween('spent_on', [$periodStart, $periodEnd]),
            'tasks',
        ])->where('status', 'active')->get();

        $revenue = (float) $businesses->sum('monthly_retainer');
        $payments = (float) $invoices->flatMap->payments
            ->whereBetween('paid_on', [$periodStart, $periodEnd])
            ->sum('amount');
        $directCosts = (float) Expense::where('allocation_type', 'direct')
            ->whereBetween('spent_on', [$periodStart, $periodEnd])
            ->sum('amount');
        $overhead = (float) Expense::where('allocation_type', 'overhead')
            ->whereBetween('spent_on', [$periodStart, $periodEnd])
            ->sum('amount');

        return Inertia::render('finance/index', [
            'invoices' => $invoices,
            'expenses' => $expenses,
            'businesses' => $businesses->map(fn (Business $business) => [
                ...$business->only(['id', 'name', 'slug', 'monthly_retainer']),
                'direct_expenses' => (float) $business->expenses->sum('amount'),
                'tracked_minutes' => $business->tasks->sum('actual_minutes'),
            ]),
            'summary' => [
                'revenue' => $revenue,
                'payments' => $payments,
                'outstanding' => (float) $invoices->sum('balance'),
                'directCosts' => $directCosts,
                'overhead' => $overhead,
                'margin' => $revenue - $directCosts - $overhead,
                'hiringThreshold' => 80000,
            ],
        ]);
    }
}
