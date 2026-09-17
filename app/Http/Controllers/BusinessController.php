<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BusinessController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('viewAny', Business::class), 403);

        return Inertia::render('businesses/index', [
            'businesses' => Business::withCount(['contentItems', 'tasks'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create', Business::class), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'primary_contact_name' => ['nullable', 'string', 'max:120'],
            'primary_contact_email' => ['nullable', 'email'],
            'primary_contact_phone' => ['nullable', 'string', 'max:50'],
            'monthly_retainer' => ['required', 'numeric', 'min:0'],
            'agreement_start' => ['nullable', 'date'],
            'deliverable_targets' => ['nullable', 'array'],
        ]);

        $business = Business::create([
            ...$data,
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'platforms' => ['facebook' => '', 'instagram' => '', 'tiktok' => ''],
        ]);

        return to_route('businesses.show', $business);
    }

    public function show(Request $request, Business $business): Response
    {
        abort_unless($request->user()->can('view', $business), 403);

        $business->load([
            'campaigns' => fn ($query) => $query->latest('starts_on'),
            'contentItems' => fn ($query) => $query->with('owner:id,name')->orderBy('publish_at'),
            'tasks' => fn ($query) => $query->with('owner:id,name')->where('status', '!=', 'done')->orderBy('due_at'),
            'performancePeriods' => fn ($query) => $query->latest('ends_on')->limit(4),
            'expenses' => fn ($query) => $query
                ->where('allocation_type', 'direct')
                ->whereBetween('spent_on', [now()->startOfMonth(), now()->endOfMonth()]),
        ]);

        $trackedMinutes = $business->tasks()->sum('actual_minutes');
        $directExpenses = (float) $business->expenses->sum('amount');

        return Inertia::render('businesses/show', [
            'business' => $business,
            'users' => User::orderBy('name')->get(['id', 'name']),
            'profitability' => [
                'directExpenses' => $directExpenses,
                'trackedMinutes' => $trackedMinutes,
                'margin' => (float) $business->monthly_retainer - $directExpenses,
            ],
        ]);
    }
}
