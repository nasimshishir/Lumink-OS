<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $invoice->number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; }
        .header { background: #101b63; color: white; padding: 28px; }
        .gold { color: #efb52e; }
        .meta { margin: 28px 0; width: 100%; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        th { color: #667085; font-size: 10px; text-transform: uppercase; }
        .amount { text-align: right; }
        .total { font-size: 18px; font-weight: bold; color: #101b63; }
    </style>
</head>
<body>
    <div class="header">
        <h1><span class="gold">Lumink</span> Co.</h1>
        <p>Social content, management & marketing</p>
    </div>
    <table class="meta">
        <tr>
            <td><strong>Invoice to</strong><br>{{ $invoice->business->name }}</td>
            <td><strong>Invoice</strong><br>{{ $invoice->number }}</td>
            <td><strong>Due</strong><br>{{ $invoice->due_date->format('d M Y') }}</td>
        </tr>
    </table>
    <table>
        <thead><tr><th>Description</th><th>Qty</th><th class="amount">Rate</th><th class="amount">Total</th></tr></thead>
        <tbody>
        @foreach ($invoice->lines as $line)
            <tr>
                <td>{{ $line->description }}</td>
                <td>{{ $line->quantity }}</td>
                <td class="amount">BDT {{ number_format($line->unit_price) }}</td>
                <td class="amount">BDT {{ number_format($line->total) }}</td>
            </tr>
        @endforeach
        </tbody>
        <tfoot>
            <tr><td colspan="3" class="amount"><strong>Total</strong></td><td class="amount total">BDT {{ number_format($invoice->total) }}</td></tr>
        </tfoot>
    </table>
</body>
</html>
