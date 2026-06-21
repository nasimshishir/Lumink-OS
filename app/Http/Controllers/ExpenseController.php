<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Expense;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'business_id' => ['nullable', 'exists:businesses,id'],
            'allocation_type' => ['required', 'in:direct,overhead'],
            'category' => ['required', 'in:shoots,transport,equipment,props,subscriptions,freelancers,administration'],
            'description' => ['required', 'string', 'max:180'],
            'vendor' => ['nullable', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'spent_on' => ['required', 'date'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $expense = Expense::create([...$data, 'created_by' => $request->user()->id]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'expense.created',
            'auditable_type' => Expense::class,
            'auditable_id' => $expense->id,
            'metadata' => ['amount' => $expense->amount, 'category' => $expense->category],
        ]);

        return back();
    }
}
