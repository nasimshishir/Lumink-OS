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
        $contentItem->load([
            'business:id,name,slug,drive_folder_url',
            'campaign:id,name',
            'owner:id,name,avatar',
            'platformVersions',
            'tasks.owner:id,name,avatar',
            'approvals' => fn ($query) => $query->with('responses')->latest(),
        ]);

        $contentItem->approvals->makeVisible('token');

        return Inertia::render('content/show', [
            'content' => $contentItem,
            'stages' => ContentItem::STAGES,
            'users' => \App\Models\User::where('is_active', true)->orderBy('name')->get(['id', 'name']),
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
            'target_audience' => ['sometimes', 'nullable', 'string'],
            'featured_items' => ['sometimes', 'nullable', 'string'],
            'shoot_notes' => ['sometimes', 'nullable', 'string'],
        ]);

        if (isset($data['featured_items'])) {
            $items = array_filter(array_map('trim', explode(',', $data['featured_items'])));
            $data['featured_items'] = empty($items) ? null : array_values($items);
        }

        $oldStage = $contentItem->stage;
        $contentItem->update($data);

        if (isset($data['stage']) && $data['stage'] !== $oldStage) {
            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'content.stage_changed',
                'auditable_type' => ContentItem::class,
                'auditable_id' => $contentItem->id,
                'metadata' => ['from' => $oldStage, 'to' => $data['stage']],
            ]);

            if ($contentItem->owner_id && $contentItem->owner_id !== $request->user()->id) {
                if ($contentItem->owner) {
                    $contentItem->owner->notify(new \App\Notifications\ContentStageChanged($contentItem, $data['stage'], $request->user()->name));
                }
            }
        }

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:reel,story,static,carousel,other'],
            'business_id' => ['required', 'exists:businesses,id'],
            'publish_at' => ['nullable', 'date'],
        ]);

        $content = ContentItem::create([
            ...$data,
            'stage' => 'idea',
            'priority' => 'medium',
            'revision_number' => 1,
            'owner_id' => $request->user()->id,
        ]);

        return to_route('content.show', $content);
    }
}
