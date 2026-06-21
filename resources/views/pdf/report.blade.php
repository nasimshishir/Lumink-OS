<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Lumink performance report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; }
        .header { background: #101b63; color: white; padding: 28px; }
        .gold { color: #efb52e; }
        .kpi { border: 1px solid #e5e7eb; padding: 16px; margin: 18px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    </style>
</head>
<body>
    <div class="header">
        <h1><span class="gold">Lumink</span> Co. Performance Report</h1>
        <p>{{ $period->business->name }} · {{ $period->starts_on->format('d M') }} – {{ $period->ends_on->format('d M Y') }}</p>
    </div>
    <div class="kpi">
        <strong>Client-reported sales change</strong>
        <h2>{{ number_format($period->sales_change_percent, 1) }}%</h2>
        <p>Baseline: {{ $period->baseline_label ?: 'Not supplied' }}</p>
    </div>
    <table>
        <thead><tr><th>Metric</th><th>Result</th></tr></thead>
        <tbody>
        @foreach (($period->metrics ?? []) as $label => $value)
            <tr><td>{{ str($label)->replace('_', ' ')->title() }}</td><td>{{ is_numeric($value) ? number_format($value) : $value }}</td></tr>
        @endforeach
        </tbody>
    </table>
    <h3>What happened</h3>
    <p>{{ $period->notes ?: 'No notes recorded.' }}</p>
    <h3>Next actions</h3>
    <p>{{ $period->next_actions ?: 'No next actions recorded.' }}</p>
</body>
</html>
