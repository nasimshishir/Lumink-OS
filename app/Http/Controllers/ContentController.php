<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\User;
use App\Notifications\ContentStageChanged;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ContentController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('viewAny', ContentItem::class), 403);

        return Inertia::render('content/index', [
            'content' => ContentItem::with(['business:id,name,slug', 'owner:id,name,avatar', 'campaign:id,name'])
                ->when(! $request->user()->canManageOperations(), fn ($query) => $query
                    ->where(fn ($query) => $query
                        ->where('owner_id', $request->user()->id)
                        ->orWhereHas('tasks', fn ($query) => $query->where('owner_id', $request->user()->id))))
                ->orderBy('publish_at')
                ->get(),
            'stages' => ContentItem::STAGES,
            'businesses' => $request->user()->canManageOperations()
                ? Business::orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    public function show(Request $request, ContentItem $contentItem): Response
    {
        abort_unless($request->user()->can('view', $contentItem), 403);

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
            'users' => $request->user()->canManageOperations()
                ? User::where('is_active', true)->orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    public function update(Request $request, ContentItem $contentItem): RedirectResponse
    {
        abort_unless($request->user()->can('update', $contentItem), 403);

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
        $creativeFields = ['brief', 'hook', 'script', 'cta', 'target_audience', 'featured_items', 'shoot_notes'];
        $hasCreativeChanges = collect($creativeFields)->contains(
            fn (string $field): bool => array_key_exists($field, $data),
        );
        $requestedStage = $data['stage'] ?? $oldStage;

        if ($hasCreativeChanges && in_array($oldStage, ['scheduled', 'published'], true) && $requestedStage !== 'editing') {
            throw ValidationException::withMessages([
                'stage' => 'Move this content back to editing before changing approved creative details.',
            ]);
        }

        if ($hasCreativeChanges && in_array($oldStage, ['client_review', 'approved'], true)) {
            $data['stage'] = 'editing';
            $requestedStage = 'editing';
        }

        $startsNewRevision = in_array($oldStage, ['client_review', 'approved', 'scheduled', 'published'], true)
            && $requestedStage === 'editing';

        $contentItem = DB::transaction(function () use ($contentItem, $data, $startsNewRevision): ContentItem {
            if ($startsNewRevision) {
                $contentItem->approvals()
                    ->whereNull('responded_at')
                    ->whereNull('revoked_at')
                    ->update(['revoked_at' => now()]);

                $data['revision_number'] = $contentItem->revision_number + 1;
            }

            $contentItem->update($data);

            return $contentItem;
        });

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
                    $contentItem->owner->notify(new ContentStageChanged($contentItem, $data['stage'], $request->user()->name));
                }
            }
        }

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create', ContentItem::class), 403);

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
