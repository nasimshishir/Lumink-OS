import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronDown,
    Circle,
    Clock,
    Eye,
    Loader2,
    Play,
    RotateCcw,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface TaskStatusStage {
    id: string;
    label: string;
    description: string;
    icon: typeof Circle;
    dotClass: string;
    badgeClass: string;
}

export const TASK_STAGES: TaskStatusStage[] = [
    {
        id: 'todo',
        label: 'To Do',
        description: 'Waiting to be started',
        icon: Circle,
        dotClass: 'bg-muted-foreground/60',
        badgeClass:
            'border-border/60 bg-muted/40 text-foreground hover:bg-muted/80',
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        description: 'Actively in production',
        icon: Clock,
        dotClass: 'bg-blue-500 animate-pulse',
        badgeClass:
            'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
    },
    {
        id: 'review',
        label: 'Under Review',
        description: 'Internal QA / creative check',
        icon: Eye,
        dotClass: 'bg-purple-500',
        badgeClass:
            'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20',
    },
    {
        id: 'done',
        label: 'Completed',
        description: 'Finished & approved',
        icon: CheckCircle2,
        dotClass: 'bg-emerald-500',
        badgeClass:
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
    },
];

export const TASK_EXCEPTION_STAGES: TaskStatusStage[] = [
    {
        id: 'blocked',
        label: 'Blocked',
        description: 'Impeded / waiting on assets',
        icon: AlertCircle,
        dotClass: 'bg-rose-500',
        badgeClass:
            'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20',
    },
];

export function getTaskStageConfig(status: string): TaskStatusStage {
    const found =
        TASK_STAGES.find((s) => s.id === status) ||
        TASK_EXCEPTION_STAGES.find((s) => s.id === status);

    return (
        found || {
            id: status,
            label: status.replace(/_/g, ' '),
            description: '',
            icon: Circle,
            dotClass: 'bg-muted-foreground',
            badgeClass: 'border-border bg-muted/40 text-foreground',
        }
    );
}

export function getNextTaskStage(status: string): {
    status: string;
    label: string;
    actionLabel: string;
    icon: typeof Play;
} | null {
    switch (status) {
        case 'todo':
            return {
                status: 'in_progress',
                label: 'In Progress',
                actionLabel: 'Start',
                icon: Play,
            };
        case 'in_progress':
            return {
                status: 'review',
                label: 'Under Review',
                actionLabel: 'To Review',
                icon: Eye,
            };
        case 'review':
            return {
                status: 'done',
                label: 'Completed',
                actionLabel: 'Mark Done',
                icon: CheckCircle2,
            };
        case 'blocked':
            return {
                status: 'in_progress',
                label: 'In Progress',
                actionLabel: 'Resume',
                icon: Play,
            };
        default:
            return null;
    }
}

interface TaskStatusDropdownProps {
    taskId: number;
    status: string;
    taskTitle?: string;
    disabled?: boolean;
    className?: string;
}

export function TaskStatusDropdown({
    taskId,
    status: initialStatus,
    disabled = false,
    className,
}: TaskStatusDropdownProps) {
    const [currentStatus, setCurrentStatus] = useState(initialStatus);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync with prop if it changes
    if (currentStatus !== initialStatus && !isUpdating) {
        setCurrentStatus(initialStatus);
    }

    const currentConfig = getTaskStageConfig(currentStatus);
    const nextStage = getNextTaskStage(currentStatus);

    function updateStatus(newStatus: string) {
        if (newStatus === currentStatus || isUpdating) {
            return;
        }

        const prev = currentStatus;
        setCurrentStatus(newStatus);
        setIsUpdating(true);

        router.patch(
            `/tasks/${taskId}`,
            { status: newStatus },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsUpdating(false);
                },
                onError: () => {
                    setCurrentStatus(prev);
                    setIsUpdating(false);
                },
            },
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={disabled || isUpdating}
                className={cn(
                    'group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:outline-none',
                    currentConfig.badgeClass,
                    disabled && 'pointer-events-none opacity-60',
                    className,
                )}
            >
                {isUpdating ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                ) : (
                    <span
                        className={cn(
                            'size-1.5 rounded-full',
                            currentConfig.dotClass,
                        )}
                    />
                )}
                <span>{currentConfig.label}</span>
                <ChevronDown className="size-3 text-muted-foreground/70 transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56 p-1">
                {nextStage && (
                    <>
                        <DropdownMenuItem
                            onClick={() => updateStatus(nextStage.status)}
                            className="flex items-center justify-between font-semibold text-primary focus:bg-primary/10 focus:text-primary"
                        >
                            <span className="flex items-center gap-2">
                                <ArrowRight className="size-3.5" />
                                Advance: {nextStage.label}
                            </span>
                            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                                Next
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                    Workflow Stages
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                    {TASK_STAGES.map((stage) => {
                        const Icon = stage.icon;
                        const isSelected = stage.id === currentStatus;

                        return (
                            <DropdownMenuItem
                                key={stage.id}
                                onClick={() => updateStatus(stage.id)}
                                className={cn(
                                    'flex items-center justify-between px-2 py-1.5 text-xs',
                                    isSelected && 'bg-accent/60 font-semibold',
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon
                                        className={cn(
                                            'size-3.5',
                                            isSelected
                                                ? 'text-primary'
                                                : 'text-muted-foreground',
                                        )}
                                    />
                                    <span>{stage.label}</span>
                                </span>
                                {isSelected && (
                                    <Check className="size-3.5 text-primary" />
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                    Flags & Exceptions
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                    {TASK_EXCEPTION_STAGES.map((stage) => {
                        const Icon = stage.icon;
                        const isSelected = stage.id === currentStatus;

                        return (
                            <DropdownMenuItem
                                key={stage.id}
                                onClick={() => updateStatus(stage.id)}
                                className={cn(
                                    'flex items-center justify-between px-2 py-1.5 text-xs',
                                    isSelected &&
                                        'bg-destructive/10 font-semibold text-destructive',
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon
                                        className={cn(
                                            'size-3.5',
                                            isSelected
                                                ? 'text-destructive'
                                                : 'text-muted-foreground',
                                        )}
                                    />
                                    <span>{stage.label}</span>
                                </span>
                                {isSelected && (
                                    <Check className="size-3.5 text-destructive" />
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface TaskAdvanceButtonProps {
    taskId: number;
    status: string;
    disabled?: boolean;
    className?: string;
}

export function TaskAdvanceButton({
    taskId,
    status,
    disabled = false,
    className,
}: TaskAdvanceButtonProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const nextStage = getNextTaskStage(status);

    function updateStatus(newStatus: string) {
        if (isUpdating) {
            return;
        }

        setIsUpdating(true);
        router.patch(
            `/tasks/${taskId}`,
            { status: newStatus },
            {
                preserveScroll: true,
                onFinish: () => setIsUpdating(false),
            },
        );
    }

    if (status === 'done') {
        return (
            <Button
                variant="ghost"
                size="sm"
                disabled={disabled || isUpdating}
                className={cn(
                    'h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground',
                    className,
                )}
                onClick={() => updateStatus('in_progress')}
                title="Reopen task to in progress"
            >
                {isUpdating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                ) : (
                    <RotateCcw className="size-3.5" />
                )}
                Reopen
            </Button>
        );
    }

    if (!nextStage) {
        return null;
    }

    // Specific styling per forward stage
    let variant: 'default' | 'outline' = 'outline';
    let customClass = '';

    if (status === 'todo') {
        // Start action
        customClass =
            'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/40';
    } else if (status === 'in_progress') {
        // To Review action
        customClass =
            'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-950/40';
    } else if (status === 'review') {
        // Mark Done action
        variant = 'default';
        customClass = 'bg-emerald-600 hover:bg-emerald-700 text-white';
    } else if (status === 'blocked') {
        // Resume action
        customClass =
            'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/40';
    }

    const Icon = nextStage.icon;

    return (
        <Button
            variant={variant}
            size="sm"
            disabled={disabled || isUpdating}
            className={cn(
                'h-8 gap-1.5 px-2.5 text-xs font-medium',
                customClass,
                className,
            )}
            onClick={() => updateStatus(nextStage.status)}
        >
            {isUpdating ? (
                <Loader2 className="size-3.5 animate-spin" />
            ) : (
                <Icon
                    className={cn(
                        'size-3.5',
                        status === 'todo' && 'fill-current',
                    )}
                />
            )}
            {nextStage.actionLabel}
        </Button>
    );
}
