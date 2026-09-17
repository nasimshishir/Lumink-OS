<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'business_id' => ['required', 'exists:businesses,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'description' => ['required', 'string', 'max:180'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = DB::transaction(function () use ($data, $request) {
            $number = 'INV-'.now()->format('Ym').'-'.Str::upper(Str::random(6));
            $invoice = Invoice::create([
                'business_id' => $data['business_id'],
                'number' => $number,
                'status' => 'sent',
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'],
                'subtotal' => $data['amount'],
                'total' => $data['amount'],
                'notes' => $data['notes'] ?? null,
            ]);
            $invoice->lines()->create([
                'description' => $data['description'],
                'quantity' => 1,
                'unit_price' => $data['amount'],
                'total' => $data['amount'],
            ]);

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'invoice.created',
                'auditable_type' => Invoice::class,
                'auditable_id' => $invoice->id,
                'metadata' => ['number' => $number, 'total' => $data['amount']],
            ]);

            return $invoice;
        });

        return back()->with('invoice_id', $invoice->id);
    }

    public function pdf(Invoice $invoice): Response
    {
        $invoice->load(['business', 'lines', 'payments']);

        return Pdf::loadView('pdf.invoice', compact('invoice'))
            ->setPaper('a4')
            ->download($invoice->number.'.pdf');
    }
}
