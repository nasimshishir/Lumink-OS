import { useForm } from '@inertiajs/react';
import { ExternalLink, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Option = { id: number; name: string };

export type EditableTask = {
    id: number;
    title: string;
    description?: string | null;
    type: string;
    priority: string;
    status: string;
    due_at?: string | null;
    estimate_minutes?: number | null;
    actual_minutes?: number | null;
    business_id?: number | null;
    business?: { id: number; name: string } | null;
    owner_id?: number | null;
    owner?: { id?: number; name?: string } | null;
    content_item?: {
        id?: number;
        title: string;
        drive_folder_url?: string | null;
        raw_footage_url?: string | null;
        final_asset_url?: string | null;
        primary_shoot?: {
            id: number;
            title: string;
            starts_at: string;
            location?: string | null;
            drive_folder_url?: string | null;
        } | null;
        referenced_shoots?:
            | {
                  id: number;
                  title: string;
                  starts_at: string;
                  drive_folder_url?: string | null;
                  broll_tags?: string[] | null;
              }[]
            | null;
    } | null;
};

export function EditTaskDialog({
    task,
    businesses = [],
    users = [],
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: {
    task: EditableTask;
    businesses?: Option[];
    users?: Option[];
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    // Format ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatForInput = (dateStr?: string | null) => {
        if (!dateStr) {
            return '';
        }

        try {
            const d = new Date(dateStr);

            if (isNaN(d.getTime())) {
                return '';
            }

            const pad = (n: number) => String(n).padStart(2, '0');

            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
            return '';
        }
    };

    const form = useForm({
        title: task.title ?? '',
        description: task.description ?? '',
        business_id: task.business_id
            ? String(task.business_id)
            : task.business?.id
              ? String(task.business.id)
              : null,
        owner_id: task.owner_id
            ? String(task.owner_id)
            : task.owner?.id
              ? String(task.owner.id)
              : null,
        type: task.type ?? 'general',
        priority: task.priority ?? 'medium',
        status: task.status ?? 'todo',
        due_at: formatForInput(task.due_at),
        estimate_minutes: task.estimate_minutes ?? 0,
        actual_minutes: task.actual_minutes ?? 0,
    });

    useEffect(() => {
        if (open) {
            form.setData({
                title: task.title ?? '',
                description: task.description ?? '',
                business_id: task.business_id
                    ? String(task.business_id)
                    : task.business?.id
                      ? String(task.business.id)
                      : null,
                owner_id: task.owner_id
                    ? String(task.owner_id)
                    : task.owner?.id
                      ? String(task.owner.id)
                      : null,
                type: task.type ?? 'general',
                priority: task.priority ?? 'medium',
                status: task.status ?? 'todo',
                due_at: formatForInput(task.due_at),
                estimate_minutes: task.estimate_minutes ?? 0,
                actual_minutes: task.actual_minutes ?? 0,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id, open]);

    function handleOpenChange(nextOpen: boolean) {
        if (nextOpen) {
            form.setData({
                title: task.title ?? '',
                description: task.description ?? '',
                business_id: task.business_id
                    ? String(task.business_id)
                    : task.business?.id
                      ? String(task.business.id)
                      : null,
                owner_id: task.owner_id
                    ? String(task.owner_id)
                    : task.owner?.id
                      ? String(task.owner.id)
                      : null,
                type: task.type ?? 'general',
                priority: task.priority ?? 'medium',
                status: task.status ?? 'todo',
                due_at: formatForInput(task.due_at),
                estimate_minutes: task.estimate_minutes ?? 0,
                actual_minutes: task.actual_minutes ?? 0,
            });
        }

        if (controlledOnOpenChange) {
            controlledOnOpenChange(nextOpen);
        } else {
            setInternalOpen(nextOpen);
        }
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.patch(`/tasks/${task.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                handleOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {(!isControlled || trigger) && trigger !== null && (
                <DialogTrigger asChild>
                    {trigger ? (
                        trigger
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2 text-xs"
                        >
                            <Pencil className="size-3.5" />
                            <span>Edit</span>
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>
                            Update task details, ownership, deadlines, and
                            tracking time.
                        </DialogDescription>
                    </DialogHeader>

                    {task.content_item &&
                        (task.content_item.drive_folder_url ||
                            task.content_item.primary_shoot?.drive_folder_url ||
                            (task.content_item.referenced_shoots &&
                                task.content_item.referenced_shoots.length >
                                    0) ||
                            task.content_item.final_asset_url) && (
                            <div className="flex flex-col gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                                        Footage & Asset Pipeline
                                    </span>
                                    <span className="truncate text-[11px] text-muted-foreground">
                                        {task.content_item.title}
                                    </span>
                                </div>

                                {(task.content_item.primary_shoot
                                    ?.drive_folder_url ||
                                    task.content_item.drive_folder_url) && (
                                    <div className="flex items-center justify-between gap-2 rounded border bg-background/80 p-2 text-xs">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-medium text-foreground">
                                                🎬 Primary Shoot Footage
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {task.content_item.primary_shoot
                                                    ?.title ??
                                                    'Raw camera footage directory'}
                                            </p>
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="default"
                                            className="h-7 shrink-0 text-xs"
                                        >
                                            <a
                                                href={
                                                    task.content_item
                                                        .primary_shoot
                                                        ?.drive_folder_url ||
                                                    task.content_item
                                                        .drive_folder_url!
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open Shoot Folder
                                                <ExternalLink className="ml-1 size-3" />
                                            </a>
                                        </Button>
                                    </div>
                                )}

                                {task.content_item.referenced_shoots &&
                                    task.content_item.referenced_shoots.length >
                                        0 && (
                                        <div className="flex flex-col gap-1.5 pt-1">
                                            <p className="text-[11px] font-medium text-muted-foreground">
                                                🗂️ Referenced B-Roll Library
                                                Folders:
                                            </p>
                                            {task.content_item.referenced_shoots.map(
                                                (shoot) => (
                                                    <div
                                                        key={shoot.id}
                                                        className="flex items-center justify-between gap-2 rounded border bg-background/60 p-1.5 text-xs"
                                                    >
                                                        <div className="min-w-0 truncate pr-2">
                                                            <span className="font-medium">
                                                                {shoot.title}
                                                            </span>
                                                            {shoot.broll_tags &&
                                                                shoot.broll_tags
                                                                    .length >
                                                                    0 && (
                                                                    <span className="ml-2 text-[10px] text-muted-foreground">
                                                                        (
                                                                        {shoot.broll_tags
                                                                            .slice(
                                                                                0,
                                                                                3,
                                                                            )
                                                                            .join(
                                                                                ', ',
                                                                            )}
                                                                        )
                                                                    </span>
                                                                )}
                                                        </div>
                                                        {shoot.drive_folder_url && (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 shrink-0 text-[11px]"
                                                            >
                                                                <a
                                                                    href={
                                                                        shoot.drive_folder_url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    Open B-Roll
                                                                    <ExternalLink className="ml-1 size-3" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                {task.content_item.final_asset_url && (
                                    <div className="flex items-center justify-between gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-medium text-emerald-700 dark:text-emerald-400">
                                                📤 Review Deliverable Asset
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {
                                                    task.content_item
                                                        .final_asset_url
                                                }
                                            </p>
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="h-7 shrink-0 text-xs"
                                        >
                                            <a
                                                href={
                                                    task.content_item
                                                        .final_asset_url
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View Asset
                                                <ExternalLink className="ml-1 size-3" />
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-task-title">Task title</Label>
                        <Input
                            id="edit-task-title"
                            value={form.data.title}
                            onChange={(event) =>
                                form.setData('title', event.target.value)
                            }
                            required
                        />
                        {form.errors.title && (
                            <div className="text-sm text-red-500">
                                {form.errors.title}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-task-description">
                            Description / Notes
                        </Label>
                        <Textarea
                            id="edit-task-description"
                            placeholder="Add context, links, or instructions..."
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            rows={3}
                        />
                        {form.errors.description && (
                            <div className="text-sm text-red-500">
                                {form.errors.description}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label>Business</Label>
                            <Select
                                value={form.data.business_id || 'none'}
                                onValueChange={(value) =>
                                    form.setData(
                                        'business_id',
                                        value === 'none' ? null : value,
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Agency task" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="none">
                                            Agency task (None)
                                        </SelectItem>
                                        {businesses.map((business) => (
                                            <SelectItem
                                                key={business.id}
                                                value={String(business.id)}
                                            >
                                                {business.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {form.errors.business_id && (
                                <div className="text-sm text-red-500">
                                    {form.errors.business_id}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Owner / Assignee</Label>
                            <Select
                                value={form.data.owner_id || 'none'}
                                onValueChange={(value) =>
                                    form.setData(
                                        'owner_id',
                                        value === 'none' ? null : value,
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="none">
                                            Unassigned
                                        </SelectItem>
                                        {users.map((user) => (
                                            <SelectItem
                                                key={user.id}
                                                value={String(user.id)}
                                            >
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {form.errors.owner_id && (
                                <div className="text-sm text-red-500">
                                    {form.errors.owner_id}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Type</Label>
                            <Select
                                value={form.data.type}
                                onValueChange={(value) =>
                                    form.setData('type', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="general">
                                            General
                                        </SelectItem>
                                        <SelectItem value="shoot">
                                            Shoot
                                        </SelectItem>
                                        <SelectItem value="editing">
                                            Editing
                                        </SelectItem>
                                        <SelectItem value="design">
                                            Design
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            Admin
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {form.errors.type && (
                                <div className="text-sm text-red-500">
                                    {form.errors.type}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Priority</Label>
                            <Select
                                value={form.data.priority}
                                onValueChange={(value) =>
                                    form.setData('priority', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">
                                            Medium
                                        </SelectItem>
                                        <SelectItem value="high">
                                            High
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {form.errors.priority && (
                                <div className="text-sm text-red-500">
                                    {form.errors.priority}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Status</Label>
                            <Select
                                value={form.data.status}
                                onValueChange={(value) =>
                                    form.setData('status', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="todo">
                                            To Do
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                            In Progress
                                        </SelectItem>
                                        <SelectItem value="blocked">
                                            Blocked
                                        </SelectItem>
                                        <SelectItem value="review">
                                            Under Review
                                        </SelectItem>
                                        <SelectItem value="done">
                                            Completed
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {form.errors.status && (
                                <div className="text-sm text-red-500">
                                    {form.errors.status}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-task-due">Due Date</Label>
                            <Input
                                id="edit-task-due"
                                type="datetime-local"
                                value={form.data.due_at || ''}
                                onChange={(event) =>
                                    form.setData('due_at', event.target.value)
                                }
                            />
                            {form.errors.due_at && (
                                <div className="text-sm text-red-500">
                                    {form.errors.due_at}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-task-estimate">
                                Estimate (minutes)
                            </Label>
                            <Input
                                id="edit-task-estimate"
                                type="number"
                                min="0"
                                value={form.data.estimate_minutes}
                                onChange={(event) =>
                                    form.setData(
                                        'estimate_minutes',
                                        Number(event.target.value),
                                    )
                                }
                            />
                            {form.errors.estimate_minutes && (
                                <div className="text-sm text-red-500">
                                    {form.errors.estimate_minutes}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-task-actual">
                                Tracked (minutes)
                            </Label>
                            <Input
                                id="edit-task-actual"
                                type="number"
                                min="0"
                                value={form.data.actual_minutes}
                                onChange={(event) =>
                                    form.setData(
                                        'actual_minutes',
                                        Number(event.target.value),
                                    )
                                }
                            />
                            {form.errors.actual_minutes && (
                                <div className="text-sm text-red-500">
                                    {form.errors.actual_minutes}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
