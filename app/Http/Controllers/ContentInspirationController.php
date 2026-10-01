<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ContentInspiration;
use App\Models\ContentItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContentInspirationController extends Controller
{
    public function store(Request $request, ContentItem $contentItem): RedirectResponse
    {
        abort_unless($request->user()->can('manageInspirations', $contentItem), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:link,image,video,note'],
            'url' => ['nullable', 'required_if:type,link', 'url', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'tags' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'required_if:type,image', 'file', 'image', 'max:15360'], // 15MB
        ]);

        $imagePath = null;
        $imageUrl = null;

        if ($request->hasFile('image') && $request->file('image')->isValid()) {
            $path = $request->file('image')->store('content-inspirations/'.$contentItem->id, 'public');
            if (is_string($path)) {
                $imagePath = $path;
                $imageUrl = Storage::disk('public')->url($path);
                if ($validated['type'] === 'link') {
                    $validated['type'] = 'image';
                }
            }
        }

        $tags = null;
        if (! empty($validated['tags'])) {
            $items = array_filter(array_map('trim', explode(',', $validated['tags'])));
            $tags = empty($items) ? null : array_values($items);
        }

        $inspiration = $contentItem->inspirations()->create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'url' => $validated['url'] ?? null,
            'image_path' => $imagePath,
            'image_url' => $imageUrl,
            'notes' => $validated['notes'] ?? null,
            'tags' => $tags,
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'content.inspiration_created',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => [
                'inspiration_id' => $inspiration->id,
                'type' => $inspiration->type,
                'title' => $inspiration->title,
            ],
        ]);

        return back()->with('success', 'Inspiration reference added successfully.');
    }

    public function destroy(Request $request, ContentItem $contentItem, ContentInspiration $inspiration): RedirectResponse
    {
        abort_unless($request->user()->can('manageInspirations', $contentItem), 403);
        abort_unless($inspiration->content_item_id === $contentItem->id, 404);

        if ($inspiration->image_path) {
            Storage::disk('public')->delete($inspiration->image_path);
        }

        $title = $inspiration->title;
        $inspiration->delete();

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'content.inspiration_deleted',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => [
                'title' => $title,
            ],
        ]);

        return back()->with('success', 'Inspiration reference removed.');
    }
}
