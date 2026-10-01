import { router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    Clock,
    ExternalLink,
    FileText,
    Loader2,
    Pencil,
    Play,
    RotateCcw,
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
    status: 'pending' | 'in_progress' | 'completed' | string;
    proof_url?: string | null;
    notes?: string | null;
    attachments?: ProofAttachment[] | null;
    verified_at?: string | null;
    user_id?: number | null;
    user?: { id: number; name: string; avatar?: string } | null;
    created_at?: string;
    updated_at?: string;
}

export const STAGE_CONFIG: Record<
    string,
    {
        label: string;
        description: string;
        hint: string;
        urlLabel: string;
        placeholderUrl: string;
        fileHint: string;
    }
> = {
    idea: {
        label: 'Idea',
        description: 'Core angle, hook concept, and creative thesis formulation.',
        hint: 'Provide a link to the concept doc/pitch (Google Doc, Notion, Figma) or upload a concept visual.',
        urlLabel: 'Concept Doc / Pitch URL',
        placeholderUrl: 'https://docs.google.com/document/...',
        fileHint: 'Upload concept brief, pitch deck slide, or reference image',
    },
    planned: {
        label: 'Planned',
        description: 'Storyboarding, shot breakdown, and talent/location logistics.',
        hint: 'Provide link to storyboard, shot list doc, or upload planning board PDF/image.',
        urlLabel: 'Storyboard / Shot List URL',
        placeholderUrl: 'https://docs.google.com/... or https://notion.so/...',
        fileHint: 'Upload storyboard PDF, shot breakdown, or planning asset',
    },
    scripted: {
        label: 'Scripted',
        description: 'Final dialogue, spoken lines, visual cues, and caption drafts.',
        hint: 'Attach link to finalized Google Doc script, teleprompter doc, or upload script PDF.',
        urlLabel: 'Script Google Doc / Notion URL',
        placeholderUrl: 'https://docs.google.com/document/...',
        fileHint: 'Upload finalized script PDF or copy document',
    },
    shoot_scheduled: {
        label: 'Shoot Scheduled',
        description: 'Talent, studio/location locked, and call sheet confirmed.',
        hint: 'Provide calendar invite link, call sheet link, or upload signed call sheet/booking confirmation.',
        urlLabel: 'Call Sheet / Calendar URL',
        placeholderUrl: 'https://calendar.google.com/... or https://...',
        fileHint: 'Upload call sheet PDF or booking confirmation screenshot',
    },
    shot: {
        label: 'Shot',
        description: 'Camera wrap; raw footage captured, logged, and uploaded to storage.',
        hint: 'Provide Google Drive raw footage folder link or upload camera roll log sheet.',
        urlLabel: 'Raw Footage Drive Folder Link',
        placeholderUrl: 'https://drive.google.com/drive/folders/...',
        fileHint: 'Upload camera log, slate photo, or raw capture screenshot',
    },
    editing: {
        label: 'Editing',
        description: 'Rough cut, sound design, color grading, motion graphics, and captions.',
        hint: 'Provide link to preview video cut (Frame.io, Google Drive, YouTube Unlisted, Loom).',
        urlLabel: 'Draft / Preview Video URL',
        placeholderUrl: 'https://frame.io/... or https://drive.google.com/...',
        fileHint: 'Upload exported video cut, render stills, or revision timeline screenshot',
    },
    internal_review: {
        label: 'Internal Review',
        description: 'Creative Director & QA check for pacing, audio sync, and brand guidelines.',
        hint: 'Provide QA review notes doc link or upload QA checklist approval screenshot.',
        urlLabel: 'QA / Internal Review Doc URL',
        placeholderUrl: 'https://docs.google.com/...',
        fileHint: 'Upload QA checklist sign-off or review markups screenshot',
    },
    client_review: {
        label: 'Client Review',
        description: 'Delivered to client approval portal or reviewed during presentation.',
        hint: 'Provide link to client approval portal or client review email thread.',
        urlLabel: 'Client Portal / Review Link',
        placeholderUrl: 'https://agency.sterkg.com/approve/... or https://...',
        fileHint: 'Upload client submission receipt or feedback summary screenshot',
    },
    approved: {
        label: 'Approved',
        description: 'Written client sign-off received; cleared for publishing.',
        hint: 'Provide approval record link or upload screenshot of written client approval (email/Slack/portal).',
        urlLabel: 'Client Approval Record URL',
        placeholderUrl: 'https://agency.sterkg.com/approve/...',
        fileHint: 'Upload written approval screenshot (email, Slack, WhatsApp, portal)',
    },
    scheduled: {
        label: 'Scheduled',
        description: 'Queued in social scheduler (Meta Suite, YouTube, TikTok, Buffer, Hootsuite).',
        hint: 'Provide scheduling dashboard URL or upload screenshot showing post queued in calendar.',
        urlLabel: 'Scheduler Dashboard URL',
        placeholderUrl: 'https://business.facebook.com/... or https://studio.youtube.com/...',
        fileHint: 'Upload screenshot of scheduling queue showing date/time locked',
    },
    published: {
        label: 'Published',
        description: 'Live in public on social media channels.',
        hint: 'Provide the live public post URL (Instagram Reel, TikTok, YouTube Video, LinkedIn).',
        urlLabel: 'Live Public Post URL',
        placeholderUrl: 'https://www.instagram.com/reel/...',
        fileHint: 'Upload screenshot of live post or analytics view',
    },
};

export function getStageStatus(
    proof?: ContentStepProof | null,
): 'pending' | 'in_progress' | 'completed' {
    if (!proof) {
        return 'pending';
    }

    if (proof.status === 'completed' || proof.status === 'verified') {
        return 'completed';
    }

    if (proof.status === 'in_progress') {
        return 'in_progress';
    }

    return 'pending';
}

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
    stages,
    proofs = [],
    canSubmitProof = true,
}: ContentStageStepperProps) {
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Map stage to its proof/status record
    const proofsMap = new Map<string, ContentStepProof>();
    proofs.forEach((p) => {
        proofsMap.set(p.stage, p);
    });

    const completedCount = proofs.filter(
        (p) => p.status === 'completed' || p.status === 'verified',
    ).length;
    const inProgressCount = proofs.filter(
        (p) => p.status === 'in_progress',
    ).length;
    const pendingCount = stages.length - completedCount - inProgressCount;

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
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Content Pipeline
                            </span>
                            <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                            >
                                {completedCount} Completed
                            </Badge>
                            {inProgressCount > 0 && (
                                <Badge
                                    variant="outline"
                                    className="bg-amber-500/10 text-[11px] font-semibold text-amber-700 dark:text-amber-400"
                                >
                                    {inProgressCount} In Progress
                                </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                                {pendingCount} Pending
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Click any stage to update status or submit proof</span>
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
                        fileHint: '',
                    };
                    const proof = proofsMap.get(stage);
                    const status = getStageStatus(proof);

                    const isCompleted = status === 'completed';
                    const isInProgress = status === 'in_progress';
                    const isPending = status === 'pending';

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
                                        isCompleted
                                            ? 'bg-emerald-500'
                                            : isInProgress
                                              ? 'bg-amber-500'
                                              : 'bg-border/60',
                                    )}
                                />
                            )}

                            {/* Node button */}
                            <button
                                type="button"
                                onClick={() => handleStageClick(stage)}
                                className="group relative z-10 flex flex-col items-center focus:outline-none"
                                title={`Click to view or update status for ${config.label}`}
                            >
                                <span
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-sm transition-all',
                                        isCompleted &&
                                            'border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/20',
                                        isInProgress &&
                                            'animate-pulse border-amber-500 bg-amber-500 text-white ring-4 ring-amber-500/20',
                                        isPending &&
                                            'border-border bg-background text-muted-foreground group-hover:border-primary group-hover:text-foreground',
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="size-4 stroke-[2.5]" />
                                    ) : isInProgress ? (
                                        <Play className="size-3 fill-current" />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </span>

                                <span
                                    className={cn(
                                        'mt-2 block text-[11px] leading-tight font-medium transition-colors',
                                        isCompleted &&
                                            'font-medium text-emerald-700 dark:text-emerald-400',
                                        isInProgress &&
                                            'font-semibold text-amber-600 dark:text-amber-400',
                                        isPending &&
                                            'text-muted-foreground group-hover:text-foreground',
                                    )}
                                >
                                    {config.label}
                                </span>

                                <span className="mt-0.5 block text-[9px] tracking-wider uppercase">
                                    {isCompleted ? (
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            Completed
                                        </span>
                                    ) : isInProgress ? (
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                            In Progress
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

            {/* Stage status & proof modal */}
            {selectedStage && (
                <StageStatusModal
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

interface StageStatusModalProps {
    contentId: number;
    stage: string;
    existingProof?: ContentStepProof;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canSubmitProof: boolean;
}

function StageStatusModal({
    contentId,
    stage,
    existingProof,
    open,
    onOpenChange,
    canSubmitProof,
}: StageStatusModalProps) {
    const config = STAGE_CONFIG[stage] || {
        label: humanize(stage),
        description: 'Track and verify stage completion.',
        hint: 'Attach proof link or upload files.',
        urlLabel: 'Proof Link',
        placeholderUrl: 'https://...',
        fileHint: 'Upload screenshot or proof file',
    };

    const currentStatus = getStageStatus(existingProof);
    const [selectedTargetStatus, setSelectedTargetStatus] = useState<
        'pending' | 'in_progress' | 'completed'
    >(currentStatus);
    const [isEditingProof, setIsEditingProof] = useState(
        currentStatus !== 'completed',
    );
    const [proofUrl, setProofUrl] = useState(existingProof?.proof_url || '');
    const [notes, setNotes] = useState(existingProof?.notes || '');
    const [advanceStage, setAdvanceStage] = useState(true);
    const [files, setFiles] = useState<File[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset when modal opens for a different stage
    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setSelectedTargetStatus(currentStatus);
            setIsEditingProof(currentStatus !== 'completed');
            setProofUrl(existingProof?.proof_url || '');
            setNotes(existingProof?.notes || '');
            setFiles([]);
            setValidationError(null);
        }

        onOpenChange(nextOpen);
    };

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setValidationError(null);
        }
    }

    const hasProofAsset =
        proofUrl.trim().length > 0 ||
        files.length > 0 ||
        Boolean(existingProof?.proof_url) ||
        Boolean(existingProof?.attachments?.length);

    function handleSetStatus(targetStatus: 'pending' | 'in_progress') {
        setIsSubmitting(true);
        setValidationError(null);

        const formData = new FormData();
        formData.append('stage', stage);
        formData.append('status', targetStatus);

        if (notes.trim()) {
            formData.append('notes', notes.trim());
        }

        formData.append('advance_stage', advanceStage ? '1' : '0');

        router.post(`/content/${contentId}/proofs`, formData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onOpenChange(false);
            },
            onError: (errors) => {
                setIsSubmitting(false);
                const firstErr = Object.values(errors)[0] as string | undefined;
                setValidationError(firstErr || 'Failed to update stage status.');
            },
        });
    }

    function handleCompleteSubmit(e: React.FormEvent) {
        e.preventDefault();
        setValidationError(null);

        // Strict client-side validation
        if (!hasProofAsset) {
            setValidationError(
                'Verification proof is required to complete this stage. Please provide a proof link or upload a file/screenshot.',
            );

            return;
        }

        if (notes.trim().length === 0 && !existingProof?.notes) {
            setValidationError(
                'Please write a completion summary or notes explaining what was accomplished.',
            );

            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('stage', stage);
        formData.append('status', 'completed');

        if (proofUrl.trim()) {
            formData.append('proof_url', proofUrl.trim());
        }

        if (notes.trim()) {
            formData.append('notes', notes.trim());
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
            onError: (errors) => {
                setIsSubmitting(false);
                const firstErr = Object.values(errors)[0] as string | undefined;
                setValidationError(
                    firstErr || 'Validation failed. Please verify all fields.',
                );
            },
        });
    }

    function handleDeleteOrReset() {
        if (!existingProof) {
            handleSetStatus('pending');

            return;
        }

        if (
            !confirm(
                `Are you sure you want to reset "${config.label}" back to Pending?`,
            )
        ) {
            return;
        }

        setIsSubmitting(true);
        router.delete(`/content/${contentId}/proofs/${existingProof.id}`, {
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

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-4">
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full text-xs font-bold',
                                    currentStatus === 'completed' &&
                                        'bg-emerald-500 text-white',
                                    currentStatus === 'in_progress' &&
                                        'bg-amber-500 text-white',
                                    currentStatus === 'pending' &&
                                        'bg-muted text-muted-foreground',
                                )}
                            >
                                {currentStatus === 'completed' ? (
                                    <Check className="size-4" />
                                ) : currentStatus === 'in_progress' ? (
                                    <Play className="size-3.5 fill-current" />
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

                        {/* Current Status Pill */}
                        {currentStatus === 'completed' && (
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400">
                                Completed ✓
                            </Badge>
                        )}
                        {currentStatus === 'in_progress' && (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
                                In Progress • Active
                            </Badge>
                        )}
                        {currentStatus === 'pending' && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                                Pending
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                {/* 3-State Status Selector Bar */}
                <div className="flex rounded-lg border bg-muted/40 p-1 text-xs">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedTargetStatus('pending');
                            setValidationError(null);
                        }}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-medium transition-colors',
                            selectedTargetStatus === 'pending'
                                ? 'bg-background font-semibold text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Clock className="size-3.5" />
                        Pending
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedTargetStatus('in_progress');
                            setValidationError(null);
                        }}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-medium transition-colors',
                            selectedTargetStatus === 'in_progress'
                                ? 'bg-amber-500/15 font-semibold text-amber-700 shadow-xs dark:text-amber-400'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Play className="size-3 fill-current" />
                        In Progress
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedTargetStatus('completed');
                            setIsEditingProof(true);
                            setValidationError(null);
                        }}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-medium transition-colors',
                            selectedTargetStatus === 'completed'
                                ? 'bg-emerald-500/15 font-semibold text-emerald-700 shadow-xs dark:text-emerald-400'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Check className="size-3.5" />
                        Completed (Proof Required)
                    </button>
                </div>

                {/* Error Banner */}
                {validationError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* TARGET STATE: PENDING */}
                {selectedTargetStatus === 'pending' && (
                    <div className="flex flex-col gap-3 py-2 text-xs">
                        <div className="rounded-lg border bg-muted/20 p-3">
                            <p className="font-semibold text-foreground">
                                Reset stage to Pending
                            </p>
                            <p className="mt-1 text-muted-foreground">
                                Marks this stage as not started yet. Any team member can start working on it whenever ready.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="h-8 text-xs"
                            >
                                Cancel
                            </Button>
                            {canSubmitProof && (
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={isSubmitting || currentStatus === 'pending'}
                                    onClick={() => handleSetStatus('pending')}
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <RotateCcw className="size-3.5" />
                                    )}
                                    Set to Pending
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* TARGET STATE: IN PROGRESS */}
                {selectedTargetStatus === 'in_progress' && (
                    <div className="flex flex-col gap-3 py-2 text-xs">
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                            <p className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                                <Play className="size-3.5 fill-current" />
                                Start Working on {config.label}
                            </p>
                            <p className="mt-1 leading-relaxed text-muted-foreground">
                                Marks this stage as actively in progress. Multiple stages can be worked on concurrently by different team members.
                            </p>
                            {existingProof?.user && (
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Last touched by:{' '}
                                    <strong className="text-foreground">
                                        {existingProof.user.name}
                                    </strong>
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="in-progress-notes" className="text-xs font-semibold">
                                Working Notes / Scope (optional)
                            </Label>
                            <Textarea
                                id="in-progress-notes"
                                placeholder="e.g. Started drafting the script with Nasim, scouted studio location..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="h-8 text-xs"
                            >
                                Cancel
                            </Button>
                            {canSubmitProof && (
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => handleSetStatus('in_progress')}
                                    className="h-8 gap-1.5 bg-amber-600 text-xs text-white hover:bg-amber-700"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <Play className="size-3.5 fill-current" />
                                    )}
                                    {currentStatus === 'in_progress'
                                        ? 'Update In Progress Notes'
                                        : 'Mark as In Progress'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* TARGET STATE: COMPLETED */}
                {selectedTargetStatus === 'completed' && (
                    <>
                        {/* VIEW MODE (When already completed and not in editing mode) */}
                        {currentStatus === 'completed' && !isEditingProof ? (
                            <div className="flex flex-col gap-4 py-2 text-xs">
                                <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3.5">
                                    <div className="flex items-center justify-between border-b pb-2 text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="size-5">
                                                <AvatarImage
                                                    src={existingProof?.user?.avatar}
                                                />
                                                <AvatarFallback className="text-[10px]">
                                                    {existingProof?.user?.name?.slice(
                                                        0,
                                                        2,
                                                    ) ?? '—'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>
                                                Completed by{' '}
                                                <strong className="text-foreground">
                                                    {existingProof?.user?.name ??
                                                        'Team Member'}
                                                </strong>
                                            </span>
                                        </div>
                                        <span>
                                            {dateTime(existingProof?.verified_at)}
                                        </span>
                                    </div>

                                    {/* Proof URL */}
                                    {existingProof?.proof_url && (
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

                                    {/* Completion Notes */}
                                    {existingProof?.notes && (
                                        <div className="rounded bg-background p-2.5">
                                            <p className="mb-1 text-[11px] font-semibold text-foreground">
                                                Completion Summary:
                                            </p>
                                            <p className="leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                                {existingProof.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Attachments */}
                                    {existingProof?.attachments &&
                                        existingProof.attachments.length > 0 && (
                                            <div className="flex flex-col gap-1.5 pt-1">
                                                <p className="text-[11px] font-semibold text-muted-foreground">
                                                    Proof Attachments (
                                                    {existingProof.attachments.length}
                                                    ):
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
                                                                    className="group flex items-center gap-2 rounded border bg-background p-2 transition-colors hover:border-primary"
                                                                >
                                                                    {isImage ? (
                                                                        <img
                                                                            src={
                                                                                att.url
                                                                            }
                                                                            alt={
                                                                                att.name
                                                                            }
                                                                            className="size-9 shrink-0 rounded object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="flex size-9 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                                                            <FileText className="size-4" />
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

                                <div className="flex items-center justify-between pt-2">
                                    {canSubmitProof && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditingProof(true)}
                                                className="gap-1.5 text-xs"
                                            >
                                                <Pencil className="size-3.5" />
                                                Edit / Add Proof
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetStatus('in_progress')}
                                                className="h-8 text-xs text-amber-600 hover:bg-amber-500/10"
                                            >
                                                <Play className="size-3 fill-current" />
                                                Reopen to In Progress
                                            </Button>
                                        </div>
                                    )}

                                    <div className="ml-auto flex items-center gap-2">
                                        {canSubmitProof && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDeleteOrReset}
                                                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="size-3.5" />
                                                Reset to Pending
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
                            /* COMPLETION PROOF FORM (MANDATORY PROOF REQUIRED) */
                            <form
                                onSubmit={handleCompleteSubmit}
                                className="flex flex-col gap-4 py-2 text-xs"
                            >
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                    <p className="mb-1 flex items-center gap-1.5 font-semibold text-primary">
                                        <AlertCircle className="size-3.5" />
                                        Mandatory Verification Requirement:
                                    </p>
                                    <p className="leading-relaxed text-muted-foreground">
                                        To complete this stage, you must provide verifiable proof: enter a <strong>Proof Link</strong> OR upload a <strong>File / Screenshot</strong>, plus a completion summary.
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        {config.hint}
                                    </p>
                                </div>

                                {/* Proof Link Field */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="proof-url" className="text-xs font-semibold">
                                        {config.urlLabel}
                                    </Label>
                                    <Input
                                        id="proof-url"
                                        type="url"
                                        placeholder={config.placeholderUrl}
                                        value={proofUrl}
                                        onChange={(e) => {
                                            setProofUrl(e.target.value);
                                            setValidationError(null);
                                        }}
                                        className="h-9 text-xs"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        Paste Google Drive, Frame.io, Google Doc, scheduling link, or live post URL.
                                    </span>
                                </div>

                                {/* Upload Proof Files */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="proof-files" className="text-xs font-semibold">
                                        Upload Proof Files or Screenshots
                                    </Label>
                                    <Input
                                        id="proof-files"
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        className="h-9 cursor-pointer text-xs file:text-xs file:font-semibold"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        {config.fileHint}
                                    </span>
                                    {files.length > 0 && (
                                        <p className="text-[11px] font-medium text-primary">
                                            {files.length} file(s) selected:{' '}
                                            {files.map((f) => f.name).join(', ')}
                                        </p>
                                    )}
                                </div>

                                {/* Completion Notes (Required) */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="proof-notes" className="text-xs font-semibold">
                                        Completion Summary & Notes *
                                    </Label>
                                    <Textarea
                                        id="proof-notes"
                                        placeholder="Summarize what was completed (e.g. all 3 scenes shot at studio, audio synced, draft cut ready for review)..."
                                        value={notes}
                                        onChange={(e) => {
                                            setNotes(e.target.value);
                                            setValidationError(null);
                                        }}
                                        rows={3}
                                        required
                                        className="text-xs"
                                    />
                                </div>

                                {/* Advance Content Stage Checkbox */}
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
                                        Advance overall content stage to{' '}
                                        <strong>{config.label}</strong>
                                    </Label>
                                </div>

                                <DialogFooter className="mt-2 flex items-center justify-between">
                                    {currentStatus === 'completed' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingProof(false)}
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
                                            disabled={
                                                isSubmitting ||
                                                !hasProofAsset ||
                                                notes.trim().length === 0
                                            }
                                            className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                            ) : (
                                                <Check className="size-3.5" />
                                            )}
                                            Complete Stage with Proof
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </form>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
