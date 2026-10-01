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
use Illuminate\Validation\ValidationException;

class ContentStepProofController extends Controller
{
    public function store(Request $request, ContentItem $contentItem): RedirectResponse
    {
        abort_unless($request->user()->can('submitProof', $contentItem), 403);

        $validated = $request->validate([
            'stage' => ['required', 'string', Rule::in(ContentItem::STAGES)],
            'status' => ['required', 'string', 'in:pending,in_progress,completed,verified'],
            'proof_url' => ['nullable', 'url', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'advance_stage' => ['nullable', 'boolean'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:25600'], // 25MB max per file
        ]);

        $stage = $validated['stage'];
        $targetStatus = $validated['status'] === 'verified' ? ContentStepProof::STATUS_COMPLETED : $validated['status'];

        /** @var ContentStepProof|null $existingProof */
        $existingProof = $contentItem->proofs()->where('stage', $stage)->first();

        // Enforce STRICT verification rules when completing a stage
        if ($targetStatus === ContentStepProof::STATUS_COMPLETED) {
            $errors = [];
            $hasSubmittedUrl = ! empty($validated['proof_url']);
            $hasSubmittedFiles = $request->hasFile('files') && count($request->file('files')) > 0;
            $hasExistingUrl = $existingProof !== null && ! empty($existingProof->proof_url);
            $hasExistingFiles = $existingProof !== null && ! empty($existingProof->attachments);

            if (! $hasSubmittedUrl && ! $hasSubmittedFiles && ! $hasExistingUrl && ! $hasExistingFiles) {
                $errors['proof_url'] = 'Verification proof is required to complete this stage. Please provide a valid proof link or attach a file/screenshot.';
            }

            $submittedNotes = trim($validated['notes'] ?? '');
            if ($submittedNotes === '' && ($existingProof === null || empty($existingProof->notes))) {
                $errors['notes'] = 'Please provide a completion summary or notes explaining what was completed.';
            }

            if (! empty($errors)) {
                throw ValidationException::withMessages($errors);
            }
        }

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

        DB::transaction(function () use ($contentItem, $validated, $stage, $targetStatus, $newAttachments, $request, $existingProof) {
            /** @var ContentStepProof $proof */
            $proof = $existingProof ?? $contentItem->proofs()->firstOrNew(['stage' => $stage]);

            $existingAttachments = $proof->attachments ?? [];
            $allAttachments = array_merge($existingAttachments, $newAttachments);

            if ($targetStatus === ContentStepProof::STATUS_COMPLETED) {
                $proof->fill([
                    'user_id' => $request->user()->id,
                    'status' => ContentStepProof::STATUS_COMPLETED,
                    'proof_url' => $validated['proof_url'] ?? $proof->proof_url,
                    'notes' => ! empty($validated['notes']) ? $validated['notes'] : $proof->notes,
                    'attachments' => empty($allAttachments) ? null : array_values($allAttachments),
                    'verified_at' => now(),
                ]);
            } elseif ($targetStatus === ContentStepProof::STATUS_IN_PROGRESS) {
                $proof->fill([
                    'user_id' => $request->user()->id,
                    'status' => ContentStepProof::STATUS_IN_PROGRESS,
                    'notes' => ! empty($validated['notes']) ? $validated['notes'] : $proof->notes,
                    'verified_at' => null,
                ]);
            } else { // pending
                $proof->fill([
                    'user_id' => null,
                    'status' => ContentStepProof::STATUS_PENDING,
                    'verified_at' => null,
                ]);
            }

            $proof->save();

            // Advance or sync deliverable stage if requested
            $advance = $request->boolean('advance_stage', true);
            if ($advance && in_array($targetStatus, [ContentStepProof::STATUS_IN_PROGRESS, ContentStepProof::STATUS_COMPLETED], true)) {
                $currentIndex = array_search($contentItem->stage, ContentItem::STAGES, true);
                $stageIndex = array_search($stage, ContentItem::STAGES, true);

                if ($stageIndex !== false && ($currentIndex === false || $stageIndex >= $currentIndex)) {
                    $contentItem->stage = $stage;
                }
            }

            // Auto-populate asset URLs if completed stage provided footage or asset link
            if ($targetStatus === ContentStepProof::STATUS_COMPLETED && ! empty($proof->proof_url)) {
                if (in_array($stage, ['shot', 'shoot_scheduled'], true) && empty($contentItem->raw_footage_url)) {
                    $contentItem->raw_footage_url = $proof->proof_url;
                } elseif (in_array($stage, ['editing', 'internal_review', 'approved'], true) && empty($contentItem->final_asset_url)) {
                    $contentItem->final_asset_url = $proof->proof_url;
                }
            }

            $contentItem->save();

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'event' => 'content.stage_status_updated',
                'auditable_type' => ContentItem::class,
                'auditable_id' => $contentItem->id,
                'metadata' => [
                    'stage' => $stage,
                    'status' => $targetStatus,
                    'proof_id' => $proof->id,
                    'proof_url' => $proof->proof_url,
                    'attachments_count' => count($allAttachments),
                ],
            ]);
        });

        $stageName = ucwords(str_replace('_', ' ', $stage));
        $statusMsg = match ($targetStatus) {
            ContentStepProof::STATUS_COMPLETED => "Stage '{$stageName}' marked as completed with verified proof.",
            ContentStepProof::STATUS_IN_PROGRESS => "Stage '{$stageName}' is now in progress.",
            default => "Stage '{$stageName}' set to pending.",
        };

        return back()->with('success', $statusMsg);
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

        return back()->with('success', "Stage '".str_replace('_', ' ', $stage)."' reset to pending.");
    }
}
