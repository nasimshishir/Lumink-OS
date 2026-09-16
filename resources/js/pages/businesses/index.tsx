import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, BriefcaseBusiness, Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
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
    content_items_count: number;
    tasks_count: number;
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

export default function Businesses({ businesses }: { businesses: Business[] }) {
    return (
        <>
            <Head title="Businesses" />
            <PageHeading
                title="Businesses"
                description="Client workspaces, agreements, delivery, and profitability."
                actions={<AddBusinessDialog />}
            />
            <main className="p-5">
                <section className="lumink-panel overflow-hidden">
                    <table className="lumink-table">
                        <thead>
                            <tr>
                                <th>Business</th>
                                <th>Status</th>
                                <th>Retainer</th>
                                <th>Agreement</th>
                                <th>Content</th>
                                <th>Open tasks</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {businesses.map((business) => (
                                <tr key={business.id}>
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
                                        <StatusBadge value={business.status} />
                                    </td>
                                    <td className="font-medium">
                                        {money(business.monthly_retainer)}
                                    </td>
                                    <td>
                                        {shortDate(business.agreement_start)}
                                    </td>
                                    <td>{business.content_items_count}</td>
                                    <td>{business.tasks_count}</td>
                                    <td>
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <Link
                                                href={`/businesses/${business.id}`}
                                            >
                                                Open
                                                <ArrowRight data-icon="inline-end" />
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </>
    );
}
