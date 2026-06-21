<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Business;
use App\Models\ContentItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('content/index', [
            'content' => ContentItem::with(['business:id,name,slug', 'owner:id,name,avatar', 'campaign:id,name'])
                ->orderBy('publish_at')
                ->get(),
            'stages' => ContentItem::STAGES,
            'businesses' => Business::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(ContentItem $contentItem): Response
    {
        return Inertia::render('content/show', [
            'content' => $contentItem->load([
                'business:id,name,slug,drive_folder_url',
                'campaign:id,name',
                'owner:id,name,avatar',
                'platformVersions',
                'tasks.owner:id,name,avatar',
                'approvals' => fn ($query) => $query->with('responses')->latest(),
            ]),
            'stages' => ContentItem::STAGES,
        ]);
    }

    public function update(Request $request, ContentItem $contentItem): RedirectResponse
    {
        $data = $request->validate([
            'stage' => ['sometimes', 'in:'.implode(',', ContentItem::STAGES)],
            'brief' => ['sometimes', 'nullable', 'string'],
            'hook' => ['sometimes', 'nullable', 'string'],
            'script' => ['sometimes', 'nullable', 'string'],
            'cta' => ['sometimes', 'nullable', 'string'],
            'shoot_notes' => ['sometimes', 'nullable', 'string'],
        ]);

        if (isset($data['stage']) && $data['stage'] !== $contentItem->stage) {
            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'content.stage_changed',
                'auditable_type' => ContentItem::class,
                'auditable_id' => $contentItem->id,
                'metadata' => ['from' => $contentItem->stage, 'to' => $data['stage']],
            ]);
        }

        $contentItem->update($data);

        return back();
    }
}
