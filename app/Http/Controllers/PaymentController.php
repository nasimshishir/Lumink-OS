<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Invoice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function store(Request $request, Invoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_on' => ['required', 'date'],
            'method' => ['nullable', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        DB::transaction(function () use ($data, $invoice, $request): void {
            $lockedInvoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
            $balance = $lockedInvoice->balance;

            if ((float) $data['amount'] > $balance) {
                throw ValidationException::withMessages([
                    'amount' => 'The payment cannot exceed the outstanding balance.',
                ]);
            }

            $payment = $lockedInvoice->payments()->create($data);
            $lockedInvoice->syncPaymentStatus();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'invoice.payment_recorded',
                'auditable_type' => Invoice::class,
                'auditable_id' => $lockedInvoice->id,
                'metadata' => [
                    'payment_id' => $payment->id,
                    'amount' => $payment->amount,
                    'paid_on' => $payment->paid_on,
                ],
            ]);
        });

        return back()->with('success', 'Payment recorded.');
    }
}
