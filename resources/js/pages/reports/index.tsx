import { Head, useForm } from '@inertiajs/react';
import { FileDown, Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeading } from '@/components/page-heading';
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

type Business = { id: number; name: string };
type Period = {
    id: number;
    starts_on: string;
    ends_on: string;
    sales_change_percent?: string;
    baseline_label?: string;
    notes?: string;
    business: Business;
};

function AddReportDialog({ businesses }: { businesses: Business[] }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        business_id: '',
        starts_on: '',
        ends_on: '',
        sales_change_percent: 0,
        baseline_label: 'Previous comparable period',
        notes: '',
        next_actions: '',
        metrics: {},
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/reports', {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus data-icon="inline-start" />
                    New report period
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Add performance period</DialogTitle>
                        <DialogDescription>
                            Record the client-reported sales change against a
                            named baseline. Platform metrics can be expanded
                            after the period is created.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Label>Business</Label>
                        <Select
                            value={form.data.business_id}
                            onValueChange={(value) =>
                                form.setData('business_id', value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose business" />
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
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="report-start">Starts</Label>
                            <Input
                                id="report-start"
                                type="date"
                                value={form.data.starts_on}
                                onChange={(event) =>
                                    form.setData(
                                        'starts_on',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="report-end">Ends</Label>
                            <Input
                                id="report-end"
                                type="date"
                                value={form.data.ends_on}
                                onChange={(event) =>
                                    form.setData('ends_on', event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="sales-change">Sales change %</Label>
                            <Input
                                id="sales-change"
                                type="number"
                                step="0.1"
                                value={form.data.sales_change_percent}
                                onChange={(event) =>
                                    form.setData(
                                        'sales_change_percent',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="baseline">Baseline</Label>
                            <Input
                                id="baseline"
                                value={form.data.baseline_label}
                                onChange={(event) =>
                                    form.setData(
                                        'baseline_label',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Save period
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Reports({
    periods,
    businesses,
}: {
    periods: Period[];
    businesses: Business[];
}) {
    return (
        <>
            <Head title="Reports" />
            <PageHeading
                title="Reports"
                description="Twice-monthly client performance periods and branded PDF exports."
                actions={<AddReportDialog businesses={businesses} />}
            />
            <main className="p-5">
                <section className="lumink-panel overflow-hidden">
                    <table className="lumink-table">
                        <thead>
                            <tr>
                                <th>Business</th>
                                <th>Period</th>
                                <th>Sales change</th>
                                <th>Baseline</th>
                                <th>Notes</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map((period) => (
                                <tr key={period.id}>
                                    <td className="font-medium">
                                        {period.business.name}
                                    </td>
                                    <td>
                                        {shortDate(period.starts_on)} –{' '}
                                        {shortDate(period.ends_on)}
                                    </td>
                                    <td className="font-semibold text-primary">
                                        {Number(period.sales_change_percent) >=
                                        0
                                            ? '+'
                                            : ''}
                                        {period.sales_change_percent}%
                                    </td>
                                    <td>{period.baseline_label ?? '—'}</td>
                                    <td>{period.notes ?? '—'}</td>
                                    <td>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <a
                                                href={`/reports/${period.id}/pdf`}
                                            >
                                                <FileDown data-icon="inline-start" />
                                                PDF
                                            </a>
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
