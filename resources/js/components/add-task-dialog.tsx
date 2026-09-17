import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
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

type Option = { id: number; name: string };

export function AddTaskDialog({
    businesses = [],
    users = [],
    businessId,
    contentId,
}: {
    businesses?: Option[];
    users?: Option[];
    businessId?: number;
    contentId?: number;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm<{
        title: string;
        business_id: string | null;
        content_item_id: string | null;
        owner_id: string | null;
        type: string;
        priority: string;
        due_at: string | null;
        estimate_minutes: number;
    }>({
        title: '',
        business_id: businessId ? String(businessId) : null,
        content_item_id: contentId ? String(contentId) : null,
        owner_id: null,
        type: 'general',
        priority: 'medium',
        due_at: null,
        estimate_minutes: 60,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/tasks', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus data-icon="inline-start" />
                    Add task
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Add task</DialogTitle>
                        <DialogDescription>
                            Create agency, business, or content work with a
                            clear owner and deadline.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="task-title">Task title</Label>
                        <Input
                            id="task-title"
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
                    <div className="grid gap-4 sm:grid-cols-2">
                        {!businessId && (
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
                                                Agency task
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
                        )}
                        <div className="flex flex-col gap-2">
                            <Label>Owner</Label>
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
                            <Label htmlFor="task-due">Due</Label>
                            <Input
                                id="task-due"
                                type="datetime-local"
                                value={form.data.due_at || ''}
                                onChange={(event) =>
                                    form.setData(
                                        'due_at',
                                        event.target.value === ''
                                            ? null
                                            : event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="task-estimate">
                                Estimate (minutes)
                            </Label>
                            <Input
                                id="task-estimate"
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Create task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
