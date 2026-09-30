import { useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
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
};

export function EditTaskDialog({
    task,
    businesses = [],
    users = [],
    trigger,
}: {
    task: EditableTask;
    businesses?: Option[];
    users?: Option[];
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

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

        setOpen(nextOpen);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.patch(`/tasks/${task.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>
                            Update task details, ownership, deadlines, and
                            tracking time.
                        </DialogDescription>
                    </DialogHeader>

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
                            onClick={() => setOpen(false)}
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
