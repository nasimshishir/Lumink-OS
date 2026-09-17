import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Clock,
    Copy,
    Mail,
    RotateCw,
    Trash2,
    UserPlus,
} from 'lucide-react';
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

type Invitation = {
    id: number;
    email: string;
    role: string;
    created_at: string;
    inviter?: { id: number; name: string };
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

export default function Team({
    users,
    invitations = [],
}: {
    users: User[];
    invitations?: Invitation[];
}) {
    const [copiedId, setCopiedId] = useState<number | null>(null);

    function copySignInLink(invitationId: number) {
        const loginUrl = `${window.location.origin}/auth/google`;
        navigator.clipboard.writeText(loginUrl);
        setCopiedId(invitationId);
        setTimeout(() => setCopiedId(null), 2500);
    }

    function resendInvitation(invitationId: number) {
        router.post(
            `/invitations/${invitationId}/resend`,
            {},
            { preserveScroll: true },
        );
    }

    function revokeInvitation(invitation: Invitation) {
        if (
            confirm(
                `Are you sure you want to revoke the invitation for ${invitation.email}? They will no longer be authorized to sign in.`,
            )
        ) {
            router.delete(`/invitations/${invitation.id}`, {
                preserveScroll: true,
            });
        }
    }

    return (
        <>
            <Head title="Team" />
            <PageHeading
                title="Team"
                description="Owner, manager, and specialist access."
                actions={<InviteDialog />}
            />
            <main className="p-5 flex flex-col gap-6">
                <section className="lumink-panel overflow-hidden">
                    <div className="border-b px-4 py-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold">Active team members</h2>
                        <span className="text-xs text-muted-foreground">{users.length} members</span>
                    </div>
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

                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold">Pending invitations</h2>
                            <p className="text-xs text-muted-foreground">
                                Google accounts authorized to join your agency.
                            </p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {invitations.length} pending
                        </span>
                    </div>

                    <div className="lumink-panel overflow-hidden">
                        {invitations.length > 0 ? (
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Google email</th>
                                        <th>Role</th>
                                        <th>Invited by</th>
                                        <th>Sent</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invitations.map((invitation) => (
                                        <tr key={invitation.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="size-4 text-muted-foreground" />
                                                    <span className="font-medium">
                                                        {invitation.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <StatusBadge value={invitation.role} />
                                            </td>
                                            <td>
                                                {invitation.inviter?.name ?? 'Owner'}
                                            </td>
                                            <td>{shortDate(invitation.created_at)}</td>
                                            <td>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                                    <Clock className="size-3" />
                                                    Pending sign-in
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            copySignInLink(invitation.id)
                                                        }
                                                        title="Copy Google sign-in link"
                                                    >
                                                        {copiedId === invitation.id ? (
                                                            <>
                                                                <Check className="size-3.5 text-emerald-600" />
                                                                <span className="text-emerald-600">Copied</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="size-3.5" />
                                                                <span>Copy link</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            resendInvitation(invitation.id)
                                                        }
                                                        title="Resend invitation"
                                                    >
                                                        <RotateCw className="size-3.5" />
                                                        <span>Resend</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() =>
                                                            revokeInvitation(invitation)
                                                        }
                                                        title="Revoke invitation"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                        <span>Revoke</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <Mail className="size-8 text-muted-foreground/50" />
                                <p className="mt-2 text-sm font-medium">No pending invitations</p>
                                <p className="text-xs text-muted-foreground">
                                    All invited accounts have signed in or no invites are outstanding.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}
