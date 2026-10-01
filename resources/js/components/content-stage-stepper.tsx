import { router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    Clock,
    ExternalLink,
    FileText,
    FileUp,
    Loader2,
    Pencil,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dateTime, humanize } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ProofAttachment {
    name: string;
    url: string;
    path: string;
    size?: number;
    mime_type?: string;
}

export interface ContentStepProof {
    id: number;
    content_item_id: number;
    stage: string;
    status: string;
    proof_url?: string | null;
    notes?: string | null;
    attachments?: ProofAttachment[] | null;
    verified_at?: string | null;
    user_id?: number | null;
    user?: { id: number; name: string; avatar?: string } | null;
}

export const STAGE_CONFIG: Record<
    string,
    {
        label: string;
        description: string;
        hint: string;
        placeholderUrl: string;
        urlLabel: string;
    }
> = {
    idea: {
        label: 'Idea',
        description:
            'Initial concept, creative thesis, or inspiration trigger.',
        hint: 'Document the hook idea, angle, or link to reference material.',
        placeholderUrl: 'https://...',
        urlLabel: 'Inspiration / Concept URL (optional)',
    },
    planned: {
        label: 'Planned',
        description: 'Storyboarding, shot planning, and resource allocation.',
        hint: 'Attach the storyboard, shot list doc, or planning notes.',
        placeholderUrl: 'https://docs.google.com/...',
        urlLabel: 'Planning Doc / Storyboard URL',
    },
    scripted: {
        label: 'Scripted',
        description: 'Final script, dialogue, hook words, and captions.',
        hint: 'Attach link to finalized Google Doc script or copy draft.',
        placeholderUrl: 'https://docs.google.com/document/...',
        urlLabel: 'Script Google Doc / Notion URL',
    },
    shoot_scheduled: {
        label: 'Shoot Scheduled',
        description:
            'Calendar invite, studio booking, talent, or shoot session.',
        hint: 'Confirm shoot date, call sheet, or shoot session link.',
        placeholderUrl: 'https://...',
        urlLabel: 'Call Sheet / Calendar URL',
    },
    shot: {
        label: 'Shot',
        description: 'Camera footage captured and ingested.',
        hint: 'Attach Google Drive raw footage folder link or upload camera roll log.',
        placeholderUrl: 'https://drive.google.com/drive/folders/...',
        urlLabel: 'Raw Footage Google Drive Folder Link',
    },
    editing: {
        label: 'Editing',
        description:
            'Timeline assembly, cut, sound design, color grade, and captions.',
        hint: 'Attach link to rough/fine cut (Frame.io, Google Drive, Loom, Vimeo, YouTube Unlisted).',
        placeholderUrl: 'https://drive.google.com/... or https://frame.io/...',
        urlLabel: 'Draft / Preview Video URL',
    },
    internal_review: {
        label: 'Internal Review',
        description: 'Creative Director / QA review and quality sign-off.',
        hint: 'Document QA checklist completion, pacing, audio sync, and brand compliance.',
        placeholderUrl: 'https://...',
        urlLabel: 'Internal Review / Sign-off Doc URL (optional)',
    },
    client_review: {
        label: 'Client Review',
        description:
            'Client approval portal link delivered or client feedback logged.',
        hint: 'Confirm approval link was sent or log client feedback comments.',
        placeholderUrl: 'https://...',
        urlLabel: 'Client Portal / Approval Link',
    },
    approved: {
        label: 'Approved',
        description: 'Client gave official green light for publishing.',
        hint: 'Confirm written approval or client portal approval response.',
        placeholderUrl: '',
        urlLabel: 'Written Approval Link / Screenshot (optional)',
    },
    scheduled: {
        label: 'Scheduled',
        description:
            'Queued on Meta Business Suite, YouTube Studio, TikTok, or Buffer.',
        hint: 'Attach screenshot of scheduling queue or scheduled post link.',
        placeholderUrl: 'https://business.facebook.com/...',
        urlLabel: 'Scheduling Dashboard Link / Proof URL',
    },
    published: {
        label: 'Published',
        description: 'Live in public on social platforms.',
        hint: 'Provide the live public post URL (Instagram Reel, TikTok, YouTube, etc.).',
        placeholderUrl: 'https://www.instagram.com/reel/...',
        urlLabel: 'Live Public Post URL',
    },
};

interface ContentStageStepperProps {
    contentId: number;
    currentStage: string;
    stages: string[];
    proofs?: ContentStepProof[];
    canSubmitProof?: boolean;
    rawFootageUrl?: string;
    finalAssetUrl?: string;
}

export function ContentStageStepper({
    contentId,
    currentStage,
    stages,
    proofs = [],
    canSubmitProof = true,
}: ContentStageStepperProps) {
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Map stage to its verified proof
    const proofsMap = new Map<string, ContentStepProof>();
    proofs.forEach((p) => {
        proofsMap.set(p.stage, p);
    });

    const currentIndex = stages.indexOf(currentStage);
    const verifiedCount = proofs.filter((p) => p.status === 'verified').length;

    function handleStageClick(stage: string) {
        setSelectedStage(stage);
        setDialogOpen(true);
    }

    return (
        <div className="rounded-xl border border-border/80 bg-white p-4 shadow-sm dark:bg-card">
            {/* Top summary row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="size-4" />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Content Pipeline
                            </span>
                            <Badge
                                variant="outline"
                                className="bg-primary/5 text-[11px] font-semibold text-primary"
                            >
                                Stage {currentIndex + 1} of {stages.length}:{' '}
                                {humanize(currentStage)}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {verifiedCount} of {stages.length} stages verified
                            with proof
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canSubmitProof && (
                        <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1.5 px-3 text-xs"
                            onClick={() => handleStageClick(currentStage)}
                        >
                            <FileUp className="size-3.5" />
                            {proofsMap.has(currentStage)
                                ? 'View / Update Current Proof'
                                : 'Verify Current Step'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Stepper ribbon */}
            <div className="mt-4 flex scrollbar-none items-center overflow-x-auto pt-1 pb-2">
                {stages.map((stage, index) => {
                    const config = STAGE_CONFIG[stage] || {
                        label: humanize(stage),
                        description: '',
                        hint: '',
                        placeholderUrl: '',
                        urlLabel: 'Proof URL',
                    };
                    const isVerified = proofsMap.has(stage);
                    const isCurrent = stage === currentStage;
                    const isPast = index < currentIndex;

                    return (
                        <div
                            key={stage}
                            className="group relative flex min-w-[85px] flex-1 flex-col items-center text-center sm:min-w-[96px]"
                        >
                            {/* Connector line behind */}
                            {index !== 0 && (
                                <div
                                    className={cn(
                                        'absolute top-4 -left-1/2 -z-0 h-[2px] w-full transition-colors',
                                        isVerified
                                            ? 'bg-emerald-500'
                                            : isPast
                                              ? 'bg-primary/40'
                                              : 'bg-border/60',
                                    )}
                                />
                            )}

                            {/* Node button */}
                            <button
                                type="button"
                                onClick={() => handleStageClick(stage)}
                                className="group relative z-10 flex flex-col items-center focus:outline-none"
                                title={`Click to view or submit proof for ${config.label}`}
                            >
                                <span
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-sm transition-all',
                                        isVerified
                                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/20'
                                            : isCurrent
                                              ? 'animate-pulse border-primary bg-primary text-primary-foreground ring-4 ring-primary/20'
                                              : 'border-border bg-background text-muted-foreground group-hover:border-primary group-hover:text-foreground',
                                    )}
                                >
                                    {isVerified ? (
                                        <Check className="size-4 stroke-[2.5]" />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </span>

                                <span
                                    className={cn(
                                        'mt-2 block text-[11px] leading-tight font-medium transition-colors',
                                        isCurrent
                                            ? 'font-semibold text-primary'
                                            : isVerified
                                              ? 'font-medium text-emerald-700 dark:text-emerald-400'
                                              : 'text-muted-foreground group-hover:text-foreground',
                                    )}
                                >
                                    {config.label}
                                </span>

                                <span className="mt-0.5 block text-[9px] tracking-wider uppercase">
                                    {isVerified ? (
                                        <span className="font-semibold text-emerald-600">
                                            Verified
                                        </span>
                                    ) : isCurrent ? (
                                        <span className="font-semibold text-primary">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground/60">
                                            Pending
                                        </span>
                                    )}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Proof submission & verification modal */}
            {selectedStage && (
                <StepProofModal
                    contentId={contentId}
                    stage={selectedStage}
                    existingProof={proofsMap.get(selectedStage)}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    canSubmitProof={canSubmitProof}
                />
            )}
        </div>
    );
}

interface StepProofModalProps {
    contentId: number;
    stage: string;
    existingProof?: ContentStepProof;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canSubmitProof: boolean;
}

function StepProofModal({
    contentId,
    stage,
    existingProof,
    open,
    onOpenChange,
    canSubmitProof,
}: StepProofModalProps) {
    const config = STAGE_CONFIG[stage] || {
        label: humanize(stage),
        description: 'Verify this step has been completed.',
        hint: 'Attach proof URL or upload files.',
        placeholderUrl: 'https://...',
        urlLabel: 'Proof URL',
    };

    const isVerified = existingProof?.status === 'verified';
    const [isEditing, setIsEditing] = useState(!isVerified);
    const [proofUrl, setProofUrl] = useState(existingProof?.proof_url || '');
    const [notes, setNotes] = useState(existingProof?.notes || '');
    const [advanceStage, setAdvanceStage] = useState(true);
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset when modal opens for a different stage
    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setIsEditing(!isVerified);
            setProofUrl(existingProof?.proof_url || '');
            setNotes(existingProof?.notes || '');
            setFiles([]);
        }

        onOpenChange(nextOpen);
    };

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('stage', stage);

        if (proofUrl) {
            formData.append('proof_url', proofUrl);
        }

        if (notes) {
            formData.append('notes', notes);
        }

        formData.append('advance_stage', advanceStage ? '1' : '0');

        files.forEach((file) => {
            formData.append('files[]', file);
        });

        router.post(`/content/${contentId}/proofs`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onOpenChange(false);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    }

    function handleDeleteProof() {
        if (!existingProof) {
            return;
        }

        if (
            !confirm(
                `Are you sure you want to remove the verification proof for "${config.label}"?`,
            )
        ) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/content/${contentId}/proofs/${existingProof.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleting(false);
                onOpenChange(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-4">
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full text-xs font-bold',
                                    isVerified
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-primary/10 text-primary',
                                )}
                            >
                                {isVerified ? (
                                    <Check className="size-4" />
                                ) : (
                                    <Clock className="size-4" />
                                )}
                            </span>
                            <div>
                                <DialogTitle className="text-base font-semibold">
                                    {config.label}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    {config.description}
                                </DialogDescription>
                            </div>
                        </div>

                        {isVerified && (
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400">
                                Verified ✓
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                {/* View Mode (when already verified and not currently editing) */}
                {isVerified && !isEditing ? (
                    <div className="flex flex-col gap-4 py-2">
                        {/* Verification details card */}
                        <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3.5 text-xs">
                            <div className="flex items-center justify-between border-b pb-2 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Avatar className="size-5">
                                        <AvatarImage
                                            src={existingProof.user?.avatar}
                                        />
                                        <AvatarFallback className="text-[10px]">
                                            {existingProof.user?.name?.slice(
                                                0,
                                                2,
                                            ) ?? '—'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span>
                                        Verified by{' '}
                                        <strong className="text-foreground">
                                            {existingProof.user?.name ??
                                                'Team Member'}
                                        </strong>
                                    </span>
                                </div>
                                <span>
                                    {dateTime(existingProof.verified_at)}
                                </span>
                            </div>

                            {/* Proof URL if present */}
                            {existingProof.proof_url && (
                                <div className="flex items-center justify-between gap-2 rounded border bg-background p-2.5">
                                    <div className="min-w-0 pr-2">
                                        <p className="truncate font-semibold text-foreground">
                                            {config.urlLabel}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {existingProof.proof_url}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="default"
                                        className="h-7 shrink-0 gap-1 text-xs"
                                    >
                                        <a
                                            href={existingProof.proof_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open Link
                                            <ExternalLink className="size-3" />
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {/* Proof Notes if present */}
                            {existingProof.notes && (
                                <div className="rounded bg-background p-2.5">
                                    <p className="mb-1 text-[11px] font-semibold text-foreground">
                                        Submission Notes / Summary:
                                    </p>
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                        {existingProof.notes}
                                    </p>
                                </div>
                            )}

                            {/* Uploaded Attachments */}
                            {existingProof.attachments &&
                                existingProof.attachments.length > 0 && (
                                    <div className="flex flex-col gap-1.5 pt-1">
                                        <p className="text-[11px] font-semibold text-muted-foreground">
                                            Proof Attachments / Screenshots (
                                            {existingProof.attachments.length}):
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {existingProof.attachments.map(
                                                (att, idx) => {
                                                    const isImage =
                                                        att.mime_type?.startsWith(
                                                            'image/',
                                                        ) ||
                                                        /\.(png|jpe?g|webp|gif)$/i.test(
                                                            att.name,
                                                        );

                                                    return (
                                                        <a
                                                            key={idx}
                                                            href={att.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="group flex items-center gap-2 rounded border bg-background p-2 text-xs transition-colors hover:border-primary"
                                                        >
                                                            {isImage ? (
                                                                <img
                                                                    src={
                                                                        att.url
                                                                    }
                                                                    alt={
                                                                        att.name
                                                                    }
                                                                    className="size-10 shrink-0 rounded object-cover"
                                                                />
                                                            ) : (
                                                                <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                                                    <FileText className="size-5" />
                                                                </span>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate font-medium group-hover:text-primary">
                                                                    {att.name}
                                                                </p>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    View file ↗
                                                                </span>
                                                            </div>
                                                        </a>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Action buttons in view mode */}
                        <div className="flex items-center justify-between pt-2">
                            {canSubmitProof && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="gap-1.5 text-xs"
                                >
                                    <Pencil className="size-3.5" />
                                    Edit / Add More Proof
                                </Button>
                            )}

                            <div className="ml-auto flex items-center gap-2">
                                {canSubmitProof && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isDeleting}
                                        onClick={handleDeleteProof}
                                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-3.5" />
                                        )}
                                        Delete Proof
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="h-8 text-xs"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Edit / Submit Proof Mode */
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4 py-2"
                    >
                        {/* Guidance Hint */}
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                            <p className="mb-1 flex items-center gap-1.5 font-semibold text-primary">
                                <AlertCircle className="size-3.5" />
                                Verification Requirement:
                            </p>
                            <p className="leading-relaxed text-muted-foreground">
                                {config.hint}
                            </p>
                        </div>

                        {/* Proof URL field */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="proof-url"
                                className="text-xs font-semibold"
                            >
                                {config.urlLabel}
                            </Label>
                            <Input
                                id="proof-url"
                                type="url"
                                placeholder={config.placeholderUrl}
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        {/* Notes / Summary */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="proof-notes"
                                className="text-xs font-semibold"
                            >
                                Verification Notes / Description
                            </Label>
                            <Textarea
                                id="proof-notes"
                                placeholder="Details about this stage completion, camera reels, color grading notes, or confirmation details..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="text-xs"
                            />
                        </div>

                        {/* File Uploads (Screenshots, PDFs, media) */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="proof-files"
                                className="text-xs font-semibold"
                            >
                                Attach Screenshots or Proof Files (optional)
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="proof-files"
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="h-9 cursor-pointer text-xs file:text-xs file:font-semibold"
                                />
                            </div>
                            {files.length > 0 && (
                                <p className="text-[11px] text-muted-foreground">
                                    {files.length} file(s) selected:{' '}
                                    {files.map((f) => f.name).join(', ')}
                                </p>
                            )}
                        </div>

                        {/* Advance Stage Checkbox */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                id="advance-stage"
                                type="checkbox"
                                checked={advanceStage}
                                onChange={(e) =>
                                    setAdvanceStage(e.target.checked)
                                }
                                className="size-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <Label
                                htmlFor="advance-stage"
                                className="cursor-pointer text-xs font-normal"
                            >
                                Advance content deliverable status to{' '}
                                <strong>{config.label}</strong>
                            </Label>
                        </div>

                        <DialogFooter className="mt-2 flex items-center justify-between">
                            {isVerified && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditing(false)}
                                    className="text-xs"
                                >
                                    Cancel Editing
                                </Button>
                            )}

                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="h-8 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSubmitting}
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <Check className="size-3.5" />
                                    )}
                                    Verify & Submit Proof
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
