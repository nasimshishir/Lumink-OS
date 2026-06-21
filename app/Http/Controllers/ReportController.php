<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\PerformancePeriod;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('reports/index', [
            'periods' => PerformancePeriod::with('business:id,name,slug')->latest('ends_on')->get(),
            'businesses' => Business::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'business_id' => ['required', 'exists:businesses,id'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'sales_change_percent' => ['nullable', 'numeric'],
            'baseline_label' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
            'next_actions' => ['nullable', 'string'],
            'metrics' => ['nullable', 'array'],
        ]);

        PerformancePeriod::create($data);

        return back();
    }

    public function pdf(PerformancePeriod $performancePeriod): HttpResponse
    {
        $performancePeriod->load('business');

        return Pdf::loadView('pdf.report', ['period' => $performancePeriod])
            ->setPaper('a4')
            ->download('Lumink-report-'.$performancePeriod->id.'.pdf');
    }
}
