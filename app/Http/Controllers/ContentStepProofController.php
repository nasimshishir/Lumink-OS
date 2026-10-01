<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ContentItem;
use App\Models\ContentStepProof;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ContentStepProofController extends Controller
{
    public function store(Request $request, ContentItem $contentItem): RedirectResponse
    {
        abort_unless($request->user()->can('submitProof', $contentItem), 403);

        $validated = $request->validate([
            'stage' => ['required', 'string', Rule::in(ContentItem::STAGES)],
            'proof_url' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'string', 'in:verified,pending,rejected'],
            'advance_stage' => ['nullable', 'boolean'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:25600'], // 25MB max per file
        ]);

        $stage = $validated['stage'];
        $newAttachments = [];

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                if ($file->isValid()) {
                    $path = $file->store('content-proofs/'.$contentItem->id, 'public');
                    if (is_string($path)) {
                        $newAttachments[] = [
                            'name' => $file->getClientOriginalName(),
                            'url' => Storage::disk('public')->url($path),
                            'path' => $path,
                            'size' => $file->getSize(),
                            'mime_type' => $file->getMimeType(),
                        ];
                    }
                }
            }
        }

        DB::transaction(function () use ($contentItem, $validated, $stage, $newAttachments, $request) {
            /** @var ContentStepProof $proof */
            $proof = $contentItem->proofs()->firstOrNew(['stage' => $stage]);

            $existingAttachments = $proof->attachments ?? [];
            $allAttachments = array_merge($existingAttachments, $newAttachments);

            $proof->fill([
                'user_id' => $request->user()->id,
                'status' => $validated['status'] ?? 'verified',
                'proof_url' => $validated['proof_url'] ?? $proof->proof_url,
                'notes' => $validated['notes'] ?? $proof->notes,
                'attachments' => empty($allAttachments) ? null : array_values($allAttachments),
                'verified_at' => now(),
            ]);

            $proof->save();

            // Advance or sync stage and asset fields if requested (default true)
            $advance = $request->boolean('advance_stage', true);
            if ($advance) {
                $currentIndex = array_search($contentItem->stage, ContentItem::STAGES, true);
                $stageIndex = array_search($stage, ContentItem::STAGES, true);

                if ($stageIndex !== false && ($currentIndex === false || $stageIndex >= $currentIndex)) {
                    $contentItem->stage = $stage;
                }
            }

            // Auto-populate asset URLs if stage provided footage or asset link
            if (! empty($proof->proof_url)) {
                if (in_array($stage, ['shot', 'shoot_scheduled'], true) && empty($contentItem->raw_footage_url)) {
                    $contentItem->raw_footage_url = $proof->proof_url;
                } elseif (in_array($stage, ['editing', 'internal_review', 'approved'], true) && empty($contentItem->final_asset_url)) {
                    $contentItem->final_asset_url = $proof->proof_url;
                }
            }

            $contentItem->save();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'content.stage_proof_submitted',
                'auditable_type' => ContentItem::class,
                'auditable_id' => $contentItem->id,
                'metadata' => [
                    'stage' => $stage,
                    'proof_id' => $proof->id,
                    'proof_url' => $proof->proof_url,
                    'attachments_count' => count($allAttachments),
                ],
            ]);
        });

        return back()->with('success', "Verification proof for stage '".str_replace('_', ' ', $stage)."' submitted successfully.");
    }

    public function destroy(Request $request, ContentItem $contentItem, ContentStepProof $proof): RedirectResponse
    {
        abort_unless($request->user()->can('submitProof', $contentItem), 403);
        abort_unless($proof->content_item_id === $contentItem->id, 404);

        if (! empty($proof->attachments)) {
            foreach ($proof->attachments as $att) {
                if (! empty($att['path'])) {
                    Storage::disk('public')->delete($att['path']);
                }
            }
        }

        $stage = $proof->stage;
        $proof->delete();

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'content.stage_proof_deleted',
            'auditable_type' => ContentItem::class,
            'auditable_id' => $contentItem->id,
            'metadata' => ['stage' => $stage],
        ]);

        return back()->with('success', "Proof for stage '".str_replace('_', ' ', $stage)."' deleted.");
    }
}
