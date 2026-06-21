import { Head, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { shortDate } from '@/lib/format';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    is_active: boolean;
    created_at: string;
};

function InviteDialog() {
    const [open, setOpen] = useState(false);
    const form = useForm({ email: '', role: 'specialist' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/invitations', {
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
                    <UserPlus data-icon="inline-start" />
                    Invite Google account
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Invite team member</DialogTitle>
                        <DialogDescription>
                            The invited Google account can sign in after the
                            role is saved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="invite-email">Google email</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            required
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Role</Label>
                        <Select
                            value={form.data.role}
                            onValueChange={(value) =>
                                form.setData('role', value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="specialist">
                                        Specialist
                                    </SelectItem>
                                    <SelectItem value="manager">
                                        Manager
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Save invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Team({ users }: { users: User[] }) {
    return (
        <>
            <Head title="Team" />
            <PageHeading
                title="Team"
                description="Owner, manager, and specialist access."
                actions={<InviteDialog />}
            />
            <main className="p-5">
                <section className="lumink-panel overflow-hidden">
                    <table className="lumink-table">
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Role</th>
                                <th>Access</th>
                                <th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage
                                                    src={user.avatar}
                                                />
                                                <AvatarFallback>
                                                    {user.name.slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <StatusBadge value={user.role} />
                                    </td>
                                    <td>
                                        {user.role === 'owner'
                                            ? 'All operations and finance'
                                            : user.role === 'manager'
                                              ? 'Operations, clients, and delivery'
                                              : 'Assigned work and assets'}
                                    </td>
                                    <td>{shortDate(user.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </>
    );
}
