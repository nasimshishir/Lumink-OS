import { Head, Link, useForm } from '@inertiajs/react';
import { FileDown, Plus, ReceiptText, WalletCards } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { money, shortDate } from '@/lib/format';

type Business = {
    id: number;
    name: string;
    slug: string;
    monthly_retainer: string;
    direct_expenses: number;
    tracked_minutes: number;
};
type Invoice = {
    id: number;
    number: string;
    status: string;
    effective_status: string;
    issue_date: string;
    due_date: string;
    total: string;
    paid_amount: number;
    balance: number;
    business: { name: string };
};
type Expense = {
    id: number;
    category: string;
    description: string;
    amount: string;
    spent_on: string;
    allocation_type: string;
    payment_method?: string;
    receipt_path?: string;
    business?: { name: string };
};

const today = new Date();
const defaultIssueDate = today.toISOString().slice(0, 10);
const defaultDueDate = new Date(today.getTime() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);

function InvoiceDialog({ businesses }: { businesses: Business[] }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        business_id: '',
        issue_date: defaultIssueDate,
        due_date: defaultDueDate,
        description: 'Monthly retainer',
        amount: 25000,
        notes: '',
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/invoices', { onSuccess: () => setOpen(false) });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <ReceiptText data-icon="inline-start" />
                    Create invoice
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Create invoice</DialogTitle>
                        <DialogDescription>
                            Add the retainer or an extra charge. Additional line
                            items can be represented as separate invoices in
                            this MVP.
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
                            <Label htmlFor="invoice-description">
                                Description
                            </Label>
                            <Input
                                id="invoice-description"
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="invoice-amount">Amount</Label>
                            <Input
                                id="invoice-amount"
                                type="number"
                                value={form.data.amount}
                                onChange={(event) =>
                                    form.setData(
                                        'amount',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="issue-date">Issue date</Label>
                            <Input
                                id="issue-date"
                                type="date"
                                value={form.data.issue_date}
                                onChange={(event) =>
                                    form.setData(
                                        'issue_date',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="due-date">Due date</Label>
                            <Input
                                id="due-date"
                                type="date"
                                value={form.data.due_date}
                                onChange={(event) =>
                                    form.setData('due_date', event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Create invoice
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PaymentDialog({ invoice }: { invoice: Invoice }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        amount: invoice.balance,
        paid_on: defaultIssueDate,
        method: 'Bank transfer',
        reference: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(`/invoices/${invoice.id}/payments`, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    Record payment
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Record payment</DialogTitle>
                        <DialogDescription>
                            {invoice.number} has {money(invoice.balance)}{' '}
                            outstanding.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`payment-amount-${invoice.id}`}>
                                Amount
                            </Label>
                            <Input
                                id={`payment-amount-${invoice.id}`}
                                type="number"
                                min="0.01"
                                max={invoice.balance}
                                step="0.01"
                                required
                                value={form.data.amount}
                                onChange={(event) =>
                                    form.setData(
                                        'amount',
                                        Number(event.target.value),
                                    )
                                }
                            />
                            {form.errors.amount && (
                                <p className="text-sm text-destructive">
                                    {form.errors.amount}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`payment-date-${invoice.id}`}>
                                Payment date
                            </Label>
                            <Input
                                id={`payment-date-${invoice.id}`}
                                type="date"
                                required
                                value={form.data.paid_on}
                                onChange={(event) =>
                                    form.setData('paid_on', event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`payment-method-${invoice.id}`}>
                                Method
                            </Label>
                            <Input
                                id={`payment-method-${invoice.id}`}
                                value={form.data.method}
                                onChange={(event) =>
                                    form.setData('method', event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`payment-reference-${invoice.id}`}>
                                Reference
                            </Label>
                            <Input
                                id={`payment-reference-${invoice.id}`}
                                value={form.data.reference}
                                onChange={(event) =>
                                    form.setData(
                                        'reference',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Save payment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ExpenseDialog({ businesses }: { businesses: Business[] }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        business_id: '',
        allocation_type: 'direct',
        category: 'shoots',
        description: '',
        vendor: '',
        amount: 0,
        spent_on: defaultIssueDate,
        payment_method: 'bKash',
        notes: '',
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            business_id: data.business_id === 'none' ? '' : data.business_id,
        }));
        form.post('/expenses', {
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
                <Button variant="outline">
                    <Plus data-icon="inline-start" />
                    Add expense
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Add expense</DialogTitle>
                        <DialogDescription>
                            Separate direct client delivery costs from general
                            agency overhead.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label>Allocation</Label>
                            <Select
                                value={form.data.allocation_type}
                                onValueChange={(value) =>
                                    form.setData('allocation_type', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="direct">
                                            Client / direct
                                        </SelectItem>
                                        <SelectItem value="overhead">
                                            Agency overhead
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Business</Label>
                            <Select
                                value={form.data.business_id || 'none'}
                                onValueChange={(value) =>
                                    form.setData('business_id', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="none">
                                            None / Agency
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
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Category</Label>
                            <Select
                                value={form.data.category}
                                onValueChange={(value) =>
                                    form.setData('category', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {[
                                            'shoots',
                                            'transport',
                                            'equipment',
                                            'props',
                                            'subscriptions',
                                            'freelancers',
                                            'administration',
                                        ].map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="expense-date">Date</Label>
                            <Input
                                id="expense-date"
                                type="date"
                                value={form.data.spent_on}
                                onChange={(event) =>
                                    form.setData('spent_on', event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <Label htmlFor="expense-description">
                                Description
                            </Label>
                            <Input
                                id="expense-description"
                                required
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="expense-amount">Amount</Label>
                            <Input
                                id="expense-amount"
                                type="number"
                                min="1"
                                required
                                value={form.data.amount}
                                onChange={(event) =>
                                    form.setData(
                                        'amount',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="expense-method">
                                Payment method
                            </Label>
                            <Input
                                id="expense-method"
                                value={form.data.payment_method}
                                onChange={(event) =>
                                    form.setData(
                                        'payment_method',
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Add expense
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Finance({
    invoices,
    expenses,
    businesses,
    summary,
}: {
    invoices: Invoice[];
    expenses: Expense[];
    businesses: Business[];
    summary: {
        revenue: number;
        payments: number;
        outstanding: number;
        directCosts: number;
        overhead: number;
        margin: number;
        hiringThreshold: number;
    };
}) {
    const hiringProgress = Math.min(
        100,
        Math.round((summary.revenue / summary.hiringThreshold) * 100),
    );

    return (
        <>
            <Head title="Finance" />
            <PageHeading
                title="Finance"
                description="Management finance · Owner only"
                actions={
                    <>
                        <InvoiceDialog businesses={businesses} />
                        <ExpenseDialog businesses={businesses} />
                    </>
                }
            />
            <main className="flex flex-col gap-5 p-5">
                <section className="lumink-panel overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
                        {[
                            ['Revenue', summary.revenue],
                            ['Payments received', summary.payments],
                            ['Outstanding', summary.outstanding],
                            ['Direct costs', summary.directCosts],
                            ['Overhead', summary.overhead],
                            ['Operating margin', summary.margin],
                        ].map(([label, value]) => (
                            <div key={String(label)} className="p-4">
                                <p className="lumink-label">{label}</p>
                                <p className="mt-2 text-lg font-semibold">
                                    {money(Number(value))}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center">
                        <p className="text-sm">
                            <strong>Hiring trigger:</strong>{' '}
                            {money(summary.hiringThreshold)} recurring revenue
                        </p>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full bg-primary"
                                style={{ width: `${hiringProgress}%` }}
                            />
                        </div>
                        <p className="text-sm font-semibold">
                            {hiringProgress}%
                        </p>
                    </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
                    <section className="lumink-panel overflow-hidden">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <h2 className="font-semibold">
                                Invoices & payments
                            </h2>
                            <Button variant="ghost" size="sm">
                                <FileDown data-icon="inline-start" />
                                Export
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="lumink-table min-w-[780px]">
                                <thead>
                                    <tr>
                                        <th>Invoice</th>
                                        <th>Business</th>
                                        <th>Issue</th>
                                        <th>Due</th>
                                        <th>Total</th>
                                        <th>Paid</th>
                                        <th>Balance</th>
                                        <th>Status</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="font-medium">
                                                {invoice.number}
                                            </td>
                                            <td>{invoice.business.name}</td>
                                            <td>
                                                {shortDate(invoice.issue_date)}
                                            </td>
                                            <td>
                                                {shortDate(invoice.due_date)}
                                            </td>
                                            <td>{money(invoice.total)}</td>
                                            <td>
                                                {money(invoice.paid_amount)}
                                            </td>
                                            <td className="font-medium">
                                                {money(invoice.balance)}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    value={
                                                        invoice.effective_status
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {invoice.balance > 0 &&
                                                        invoice.effective_status !==
                                                            'cancelled' && (
                                                            <PaymentDialog
                                                                invoice={
                                                                    invoice
                                                                }
                                                            />
                                                        )}
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="ghost"
                                                    >
                                                        <a
                                                            href={`/invoices/${invoice.id}/pdf`}
                                                        >
                                                            PDF
                                                        </a>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <section className="lumink-panel overflow-hidden">
                        <div className="border-b px-4 py-3">
                            <h2 className="font-semibold">
                                Client profitability
                            </h2>
                        </div>
                        <table className="lumink-table">
                            <thead>
                                <tr>
                                    <th>Business</th>
                                    <th>Retainer</th>
                                    <th>Direct costs</th>
                                    <th>Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {businesses.map((business) => {
                                    const margin =
                                        Number(business.monthly_retainer) -
                                        business.direct_expenses;

                                    return (
                                        <tr key={business.id}>
                                            <td>
                                                <Link
                                                    className="font-medium text-primary"
                                                    href={`/businesses/${business.id}`}
                                                >
                                                    {business.name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {Math.round(
                                                        business.tracked_minutes /
                                                            60,
                                                    )}{' '}
                                                    tracked hours
                                                </p>
                                            </td>
                                            <td>
                                                {money(
                                                    business.monthly_retainer,
                                                )}
                                            </td>
                                            <td>
                                                {money(
                                                    business.direct_expenses,
                                                )}
                                            </td>
                                            <td className="font-semibold">
                                                {money(margin)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </section>
                </div>

                <section className="lumink-panel overflow-hidden">
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                        <WalletCards className="size-5 text-primary" />
                        <h2 className="font-semibold">Recent expenses</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="lumink-table min-w-[760px]">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Business</th>
                                    <th>Allocation</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td>{shortDate(expense.spent_on)}</td>
                                        <td className="capitalize">
                                            {expense.category}
                                        </td>
                                        <td className="font-medium">
                                            {expense.description}
                                        </td>
                                        <td>
                                            {expense.business?.name ?? 'Agency'}
                                        </td>
                                        <td>
                                            <StatusBadge
                                                value={expense.allocation_type}
                                            />
                                        </td>
                                        <td>{money(expense.amount)}</td>
                                        <td>{expense.payment_method ?? '—'}</td>
                                        <td>
                                            <StatusBadge
                                                value={
                                                    expense.receipt_path
                                                        ? 'received'
                                                        : 'missing'
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </>
    );
}
