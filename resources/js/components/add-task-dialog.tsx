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
}: {
    businesses?: Option[];
    users?: Option[];
    businessId?: number;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        title: '',
        business_id: businessId ? String(businessId) : '',
        owner_id: '',
        type: 'general',
        priority: 'medium',
        due_at: '',
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
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label>Business</Label>
                            <Select
                                value={form.data.business_id}
                                onValueChange={(value) =>
                                    form.setData('business_id', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Agency task" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
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
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Owner</Label>
                            <Select
                                value={form.data.owner_id}
                                onValueChange={(value) =>
                                    form.setData('owner_id', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
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
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="task-due">Due</Label>
                            <Input
                                id="task-due"
                                type="datetime-local"
                                value={form.data.due_at}
                                onChange={(event) =>
                                    form.setData('due_at', event.target.value)
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
