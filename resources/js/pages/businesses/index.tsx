import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Plus,
    Power,
    PowerOff,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
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
import { money, shortDate } from '@/lib/format';

type Business = {
    id: number;
    name: string;
    slug: string;
    status: string;
    industry: string;
    monthly_retainer: string;
    agreement_start?: string;
    deleted_at?: string;
    content_items_count: number;
    tasks_count: number;
};

type Props = {
    businesses: Business[];
    trashedCount?: number;
    canManage?: boolean;
    isOwner?: boolean;
};

function AddBusinessDialog() {
    const [open, setOpen] = useState(false);
    const form = useForm({
        name: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        monthly_retainer: 25000,
        agreement_start: new Date().toISOString().slice(0, 10),
        deliverable_targets: { reels: 10, stories: 12, static: 4, shoots: 4 },
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/businesses', { onSuccess: () => setOpen(false) });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus data-icon="inline-start" />
                    Add business
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form className="flex flex-col gap-5" onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Set up a business</DialogTitle>
                        <DialogDescription>
                            Create the operating profile. Platforms, brand
                            guidance, and Drive can be completed from the
                            workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <Label htmlFor="business-name">Business name</Label>
                            <Input
                                id="business-name"
                                required
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="contact-name">Contact name</Label>
                            <Input
                                id="contact-name"
                                value={form.data.primary_contact_name}
                                onChange={(event) =>
                                    form.setData(
                                        'primary_contact_name',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="contact-email">Contact email</Label>
                            <Input
                                id="contact-email"
                                type="email"
                                value={form.data.primary_contact_email}
                                onChange={(event) =>
                                    form.setData(
                                        'primary_contact_email',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="contact-phone">Phone</Label>
                            <Input
                                id="contact-phone"
                                value={form.data.primary_contact_phone}
                                onChange={(event) =>
                                    form.setData(
                                        'primary_contact_phone',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="retainer">Monthly retainer</Label>
                            <Input
                                id="retainer"
                                type="number"
                                value={form.data.monthly_retainer}
                                onChange={(event) =>
                                    form.setData(
                                        'monthly_retainer',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="start-date">Agreement start</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={form.data.agreement_start}
                                onChange={(event) =>
                                    form.setData(
                                        'agreement_start',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Create workspace
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Businesses({
    businesses = [],
    trashedCount = 0,
    canManage = true,
}: Props) {
    const [currentTab, setCurrentTab] = useState<'active' | 'inactive' | 'all'>(
        'active',
    );

    // Dialog state for moving a business to trash
    const [businessToTrash, setBusinessToTrash] = useState<Business | null>(
        null,
    );
    const [actionInProgress, setActionInProgress] = useState<number | null>(
        null,
    );

    const activeList = businesses.filter((b) => b.status === 'active');
    const inactiveList = businesses.filter((b) => b.status !== 'active');

    const displayedBusinesses =
        currentTab === 'active'
            ? activeList
            : currentTab === 'inactive'
              ? inactiveList
              : businesses;

    function handleToggleStatus(business: Business) {
        setActionInProgress(business.id);
        router.patch(
            `/businesses/${business.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setActionInProgress(null),
            },
        );
    }

    function confirmMoveToTrash() {
        if (!businessToTrash) {
            return;
        }

        setActionInProgress(businessToTrash.id);
        router.delete(`/businesses/${businessToTrash.id}`, {
            preserveScroll: true,
            onSuccess: () => setBusinessToTrash(null),
            onFinish: () => setActionInProgress(null),
        });
    }

    return (
        <>
            <Head title="Businesses" />
            <PageHeading
                title="Businesses"
                description="Client workspaces, agreements, delivery, and profitability."
                actions={<AddBusinessDialog />}
            />

            <main className="flex flex-col gap-5 p-5">
                {/* Navigation Filter Tabs & Central Recycle Bin Link */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-lg border bg-muted p-1 text-sm font-medium">
                        <button
                            type="button"
                            onClick={() => setCurrentTab('active')}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${
                                currentTab === 'active'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Active
                            <Badge
                                variant={
                                    currentTab === 'active'
                                        ? 'default'
                                        : 'secondary'
                                }
                                className="px-1.5 py-0 text-xs"
                            >
                                {activeList.length}
                            </Badge>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentTab('inactive')}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${
                                currentTab === 'inactive'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Inactive
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-xs"
                            >
                                {inactiveList.length}
                            </Badge>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentTab('all')}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${
                                currentTab === 'all'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            All
                            <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-xs"
                            >
                                {businesses.length}
                            </Badge>
                        </button>
                    </div>

                    {canManage && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/recycle-bin?tab=businesses">
                                <Trash2 className="mr-1.5 size-3.5 text-muted-foreground" />
                                Recycle Bin
                                {trashedCount > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1.5 py-0 text-xs"
                                    >
                                        {trashedCount}
                                    </Badge>
                                )}
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Businesses Table */}
                <section className="lumink-panel overflow-hidden">
                    {displayedBusinesses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <BriefcaseBusiness className="size-10 text-muted-foreground" />
                            <h3 className="mt-3 text-base font-semibold">
                                {currentTab === 'inactive'
                                    ? 'No inactive businesses'
                                    : 'No businesses found'}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {currentTab === 'inactive'
                                    ? 'All configured businesses are currently active.'
                                    : 'Get started by creating a new business workspace.'}
                            </p>
                        </div>
                    ) : (
                        <table className="lumink-table">
                            <thead>
                                <tr>
                                    <th>Business</th>
                                    <th>Status</th>
                                    <th>Retainer</th>
                                    <th>Agreement</th>
                                    <th>Content</th>
                                    <th>Open tasks</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedBusinesses.map((business) => (
                                    <tr
                                        key={business.id}
                                        className="cursor-pointer transition-colors hover:bg-muted/50"
                                        onClick={() =>
                                            router.visit(
                                                `/businesses/${business.id}`,
                                            )
                                        }
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                                    <BriefcaseBusiness className="size-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">
                                                        {business.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {business.industry}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge
                                                value={business.status}
                                            />
                                        </td>
                                        <td className="font-medium">
                                            {money(business.monthly_retainer)}
                                        </td>
                                        <td className="text-muted-foreground">
                                            {shortDate(
                                                business.agreement_start,
                                            )}
                                        </td>
                                        <td>{business.content_items_count}</td>
                                        <td>{business.tasks_count}</td>
                                        <td
                                            className="text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                actionInProgress ===
                                                                business.id
                                                            }
                                                            onClick={() =>
                                                                handleToggleStatus(
                                                                    business,
                                                                )
                                                            }
                                                            title={
                                                                business.status ===
                                                                'active'
                                                                    ? 'Deactivate workspace'
                                                                    : 'Activate workspace'
                                                            }
                                                            className={
                                                                business.status ===
                                                                'active'
                                                                    ? 'text-muted-foreground hover:text-amber-600'
                                                                    : 'text-emerald-600 hover:text-emerald-700'
                                                            }
                                                        >
                                                            {business.status ===
                                                            'active' ? (
                                                                <>
                                                                    <PowerOff className="size-3.5" />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Power className="size-3.5" />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={
                                                                actionInProgress ===
                                                                business.id
                                                            }
                                                            onClick={() =>
                                                                setBusinessToTrash(
                                                                    business,
                                                                )
                                                            }
                                                            className="text-muted-foreground hover:text-destructive"
                                                            title="Move to Recycle Bin"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>

            {/* Move to Trash Confirmation Dialog */}
            <Dialog
                open={Boolean(businessToTrash)}
                onOpenChange={(open) => !open && setBusinessToTrash(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Move workspace to Recycle Bin?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to move{' '}
                            <strong>{businessToTrash?.name}</strong> to the
                            Recycle Bin?
                            <br />
                            <br />
                            The workspace will be deactivated and hidden from
                            daily operations, active task queues, and revenue
                            reports. It can be viewed and restored at any time
                            from the admin panel's central Recycle Bin.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setBusinessToTrash(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmMoveToTrash}
                            disabled={Boolean(actionInProgress)}
                        >
                            Move to Recycle Bin
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
