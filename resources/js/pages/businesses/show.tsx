import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FolderOpen,
    Pencil,
    Power,
    PowerOff,
    Target,
    Trash2,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AddContentDialog } from '@/components/add-content-dialog';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { StatusBadge } from '@/components/status-badge';
import {
    TaskAdvanceButton,
    TaskStatusDropdown,
} from '@/components/task-status-control';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dateTime, humanize, money, shortDate } from '@/lib/format';

type Campaign = {
    id: number;
    name: string;
    objective?: string;
    target_audience?: string;
    budget: string;
    status: string;
    featured_items?: string[];
};
type Content = {
    id: number;
    title: string;
    stage: string;
    type: string;
    publish_at?: string;
    owner?: { name: string };
    drive_folder_url?: string;
};
type Task = {
    id: number;
    title: string;
    description?: string | null;
    type: string;
    due_at?: string | null;
    status: string;
    priority?: string;
    estimate_minutes?: number | null;
    actual_minutes?: number | null;
    owner_id?: number | null;
    owner?: { id?: number; name?: string } | null;
};
type Period = {
    id: number;
    starts_on: string;
    ends_on: string;
    sales_change_percent?: string;
    notes?: string;
    metrics?: Record<string, string | number>;
};
type Payment = {
    id: number;
    amount: string;
    paid_on: string;
};
type Invoice = {
    id: number;
    number: string;
    status: string;
    issue_date: string;
    due_date: string;
    total: string;
    payments?: Payment[];
};
type Expense = {
    id: number;
    category: string;
    amount: string;
    spent_on: string;
    description?: string;
};
type ShootSession = {
    id: number;
    title: string;
    starts_at: string;
    ends_at?: string | null;
    status: string;
    location?: string | null;
    drive_folder_url?: string | null;
};
type Business = {
    id: number;
    name: string;
    status: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    primary_contact_phone?: string;
    platforms?: Record<string, string>;
    monthly_retainer: string;
    agreement_start?: string;
    agreement_end?: string;
    approval_deadline_hours: number;
    drive_folder_url?: string;
    drive_folders_map?: Record<string, string>;
    deliverable_targets?: Record<string, number>;
    campaigns: Campaign[];
    content_items: Content[];
    tasks: Task[];
    performance_periods: Period[];
    invoices?: Invoice[];
    expenses?: Expense[];
    shoot_sessions?: ShootSession[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

// ─── EditTargetsDialog ────────────────────────────────────────────────────────

function EditTargetsDialog({ business }: { business: Business }) {
    const [open, setOpen] = useState(false);
    const defaults = business.deliverable_targets ?? {};
    const [reels, setReels] = useState(String(defaults.reels ?? 10));
    const [statics, setStatics] = useState(String(defaults.static ?? 4));
    const [carousel, setCarousel] = useState(String(defaults.carousel ?? 4));
    const [stories, setStories] = useState(String(defaults.stories ?? 12));
    const [cinematic, setCinematic] = useState(String(defaults.cinematic ?? 2));
    const [saving, setSaving] = useState(false);

    function save() {
        setSaving(true);
        router.patch(
            `/businesses/${business.id}`,
            {
                deliverable_targets: {
                    reels: Number(reels),
                    static: Number(statics),
                    carousel: Number(carousel),
                    stories: Number(stories),
                    cinematic: Number(cinematic),
                },
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-muted-foreground hover:text-foreground"
                title="Edit monthly targets"
            >
                <Pencil className="size-3.5" />
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit monthly delivery targets</DialogTitle>
                        <DialogDescription>
                            Set the expected number of deliverables per content
                            type for {business.name} each month.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Reels', value: reels, set: setReels },
                            {
                                label: 'Static',
                                value: statics,
                                set: setStatics,
                            },
                            {
                                label: 'Carousel',
                                value: carousel,
                                set: setCarousel,
                            },
                            {
                                label: 'Stories',
                                value: stories,
                                set: setStories,
                            },
                            {
                                label: 'Cinematic',
                                value: cinematic,
                                set: setCinematic,
                            },
                        ].map(({ label, value, set }) => (
                            <div key={label} className="flex flex-col gap-2">
                                <Label>{label}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={value}
                                    onChange={(e) => set(e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={saving}>
                            Save targets
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ─── EditBusinessDialog ───────────────────────────────────────────────────────

function EditBusinessDialog({ business }: { business: Business }) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: business.name,
        primary_contact_name: business.primary_contact_name ?? '',
        primary_contact_email: business.primary_contact_email ?? '',
        primary_contact_phone: business.primary_contact_phone ?? '',
        monthly_retainer: business.monthly_retainer,
        agreement_start: business.agreement_start?.slice(0, 10) ?? '',
        agreement_end: business.agreement_end?.slice(0, 10) ?? '',
        drive_folder_url: business.drive_folder_url ?? '',
    });

    function openDialog() {
        setForm({
            name: business.name,
            primary_contact_name: business.primary_contact_name ?? '',
            primary_contact_email: business.primary_contact_email ?? '',
            primary_contact_phone: business.primary_contact_phone ?? '',
            monthly_retainer: business.monthly_retainer,
            agreement_start: business.agreement_start?.slice(0, 10) ?? '',
            agreement_end: business.agreement_end?.slice(0, 10) ?? '',
            drive_folder_url: business.drive_folder_url ?? '',
        });
        setOpen(true);
    }

    function set(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }

    function save() {
        setSaving(true);
        router.patch(
            `/businesses/${business.id}`,
            {
                name: form.name,
                primary_contact_name: form.primary_contact_name || null,
                primary_contact_email: form.primary_contact_email || null,
                primary_contact_phone: form.primary_contact_phone || null,
                monthly_retainer: form.monthly_retainer,
                agreement_start: form.agreement_start || null,
                agreement_end: form.agreement_end || null,
                drive_folder_url: form.drive_folder_url || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={openDialog}
                className="gap-1.5"
            >
                <Pencil className="size-3.5" />
                Edit info
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit business info</DialogTitle>
                        <DialogDescription>
                            Update contact details, agreement dates, and
                            retainer for {business.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="biz-name">Business name</Label>
                            <Input
                                id="biz-name"
                                value={form.name}
                                onChange={set('name')}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="biz-contact-name">
                                    Contact name
                                </Label>
                                <Input
                                    id="biz-contact-name"
                                    placeholder="Full name"
                                    value={form.primary_contact_name}
                                    onChange={set('primary_contact_name')}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="biz-contact-phone">
                                    Contact phone
                                </Label>
                                <Input
                                    id="biz-contact-phone"
                                    type="tel"
                                    placeholder="+880..."
                                    value={form.primary_contact_phone}
                                    onChange={set('primary_contact_phone')}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="biz-contact-email">
                                Contact email
                            </Label>
                            <Input
                                id="biz-contact-email"
                                type="email"
                                placeholder="client@example.com"
                                value={form.primary_contact_email}
                                onChange={set('primary_contact_email')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="biz-start">
                                    Agreement start
                                </Label>
                                <Input
                                    id="biz-start"
                                    type="date"
                                    value={form.agreement_start}
                                    onChange={set('agreement_start')}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="biz-end">Agreement end</Label>
                                <Input
                                    id="biz-end"
                                    type="date"
                                    value={form.agreement_end}
                                    onChange={set('agreement_end')}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="biz-retainer">
                                    Monthly retainer (৳)
                                </Label>
                                <Input
                                    id="biz-retainer"
                                    type="number"
                                    min={0}
                                    step={500}
                                    value={form.monthly_retainer}
                                    onChange={set('monthly_retainer')}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="biz-drive">
                                    Drive folder URL
                                </Label>
                                <Input
                                    id="biz-drive"
                                    type="url"
                                    placeholder="https://drive.google.com/..."
                                    value={form.drive_folder_url}
                                    onChange={set('drive_folder_url')}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={saving}>
                            Save changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ─── BusinessCalendar (inline for the tab) ───────────────────────────────────

type CalendarEvent = {
    id: number;
    title: string;
    date: string;
    kind: 'content' | 'task' | 'shoot';
    status: string;
    url: string;
};

function BusinessCalendar({ events }: { events: CalendarEvent[] }) {
    const today = new Date();
    const [current, setCurrent] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1),
    );

    const year = current.getFullYear();
    const month = current.getMonth();

    const days = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(null);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(new Date(year, month, d));
        }

        return cells;
    }, [year, month]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};

        for (const ev of events) {
            const d = new Date(ev.date);

            if (d.getFullYear() === year && d.getMonth() === month) {
                const key = d.getDate().toString();
                (map[key] ??= []).push(ev);
            }
        }

        return map;
    }, [events, year, month]);

    function prev() {
        setCurrent(new Date(year, month - 1, 1));
    }
    function next() {
        setCurrent(new Date(year, month + 1, 1));
    }

    return (
        <div className="lumink-panel overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
                <button
                    onClick={prev}
                    className="rounded p-1 hover:bg-muted"
                    aria-label="Previous month"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <h2 className="font-semibold">
                    {MONTHS[month]} {year}
                </h2>
                <button
                    onClick={next}
                    className="rounded p-1 hover:bg-muted"
                    aria-label="Next month"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((d) => (
                    <div key={d} className="py-2">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 divide-x divide-y">
                {days.map((day, i) => {
                    if (!day) {
                        return (
                            <div
                                key={`empty-${i}`}
                                className="min-h-[80px] bg-muted/20 p-1"
                            />
                        );
                    }

                    const isToday = isSameDay(day, today);
                    const dayEvents =
                        eventsByDate[day.getDate().toString()] ?? [];

                    return (
                        <div
                            key={day.toISOString()}
                            className="min-h-[80px] p-1"
                        >
                            <span
                                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                                    isToday
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                {day.getDate()}
                            </span>
                            <div className="mt-1 flex flex-col gap-0.5">
                                {dayEvents.slice(0, 3).map((ev) => (
                                    <Link
                                        key={`${ev.kind}-${ev.id}`}
                                        href={ev.url}
                                        className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium ${
                                            ev.kind === 'content'
                                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                : ev.kind === 'shoot'
                                                  ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'
                                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        }`}
                                        title={ev.title}
                                    >
                                        {ev.title}
                                    </Link>
                                ))}
                                {dayEvents.length > 3 && (
                                    <span className="px-1 text-[10px] text-muted-foreground">
                                        +{dayEvents.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded bg-primary/30" />
                    Content publish
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded bg-emerald-400/50" />
                    Shoot session
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded bg-amber-200" />
                    Task due
                </span>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BusinessShow({
    business,
    users = [],
    canManage = true,
    isOwner = true,
    profitability,
}: {
    business: Business;
    users?: { id: number; name: string }[];
    canManage?: boolean;
    isOwner?: boolean;
    profitability: {
        directExpenses: number;
        trackedMinutes: number;
        margin: number;
    };
}) {
    const [activeTab, setActiveTab] = useState('Overview');
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [trashOpen, setTrashOpen] = useState(false);
    const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
    const [actionInProgress, setActionInProgress] = useState(false);

    const targets = business.deliverable_targets ?? {};
    const delivered = {
        reels: business.content_items.filter((item) => item.type === 'reel')
            .length,
        static: business.content_items.filter((item) =>
            ['static', 'photo', 'post'].includes(item.type),
        ).length,
        carousel: business.content_items.filter(
            (item) => item.type === 'carousel',
        ).length,
        stories: business.content_items.filter((item) => item.type === 'story')
            .length,
        cinematic: business.content_items.filter(
            (item) => item.type === 'cinematic',
        ).length,
    };

    // Calendar events built from already-loaded data
    const calendarEvents = useMemo<CalendarEvent[]>(() => {
        const evs: CalendarEvent[] = [];

        for (const item of business.content_items) {
            if (item.publish_at) {
                evs.push({
                    id: item.id,
                    title: item.title,
                    date: item.publish_at,
                    kind: 'content',
                    status: item.stage,
                    url: `/content/${item.id}`,
                });
            }
        }

        for (const task of business.tasks) {
            if (task.due_at) {
                evs.push({
                    id: task.id,
                    title: task.title,
                    date: task.due_at,
                    kind: 'task',
                    status: task.status,
                    url: `/businesses/${business.id}?tab=Tasks`,
                });
            }
        }

        for (const shoot of business.shoot_sessions ?? []) {
            if (shoot.starts_at) {
                evs.push({
                    id: shoot.id,
                    title: `Shoot: ${shoot.title}`,
                    date: shoot.starts_at,
                    kind: 'shoot',
                    status: shoot.status,
                    url: `/shoots/${shoot.id}`,
                });
            }
        }

        return evs;
    }, [business]);

    // Finance summaries
    const totalInvoiced = useMemo(
        () =>
            (business.invoices ?? []).reduce(
                (sum, inv) => sum + parseFloat(inv.total),
                0,
            ),
        [business.invoices],
    );
    const totalPaid = useMemo(
        () =>
            (business.invoices ?? []).reduce((sum, inv) => {
                const paid = (inv.payments ?? []).reduce(
                    (s, p) => s + parseFloat(p.amount),
                    0,
                );

                return sum + paid;
            }, 0),
        [business.invoices],
    );
    const totalExpenses = useMemo(
        () =>
            (business.expenses ?? []).reduce(
                (sum, ex) => sum + parseFloat(ex.amount),
                0,
            ),
        [business.expenses],
    );

    // Drive folders for Files tab
    const driveMap = business.drive_folders_map ?? {};
    const hasAnyDrive =
        business.drive_folder_url ||
        Object.values(driveMap).some(Boolean) ||
        business.content_items.some((c) => c.drive_folder_url);

    function handleToggleStatus() {
        setActionInProgress(true);
        router.patch(
            `/businesses/${business.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setActionInProgress(false),
            },
        );
    }

    function confirmMoveToTrash() {
        setActionInProgress(true);
        router.delete(`/businesses/${business.id}`, {
            onFinish: () => setActionInProgress(false),
        });
    }

    function confirmForceDelete() {
        setActionInProgress(true);
        router.delete(`/businesses/${business.id}/force-delete`, {
            onFinish: () => setActionInProgress(false),
        });
    }

    const tabs = [
        { label: 'Overview' },
        {
            label: 'Content',
            badge: business.content_items.length || undefined,
        },
        {
            label: 'Tasks',
            badge: business.tasks.length || undefined,
        },
        { label: 'Calendar' },
        { label: 'Files' },
        { label: 'Performance' },
        { label: 'Finance' },
    ];

    return (
        <>
            <Head title={business.name} />
            <header className="border-b bg-white px-5 py-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">
                                {business.name}
                            </h1>
                            <StatusBadge value={business.status} />
                        </div>
                        <div className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="lumink-label">Contact</p>
                                <p className="mt-1 font-medium">
                                    {business.primary_contact_name ?? 'Not set'}
                                </p>
                                <p className="text-muted-foreground">
                                    {business.primary_contact_phone}
                                </p>
                            </div>
                            <div>
                                <p className="lumink-label">Agreement</p>
                                <p className="mt-1">
                                    {shortDate(business.agreement_start)} –{' '}
                                    {shortDate(business.agreement_end)}
                                </p>
                            </div>
                            <div>
                                <p className="lumink-label">Monthly retainer</p>
                                <p className="mt-1 font-semibold">
                                    {money(business.monthly_retainer)}
                                </p>
                            </div>
                            <div>
                                <p className="lumink-label">
                                    Approval deadline
                                </p>
                                <p className="mt-1">
                                    Within {business.approval_deadline_hours}{' '}
                                    hours
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {business.drive_folder_url && (
                            <Button asChild variant="outline">
                                <a
                                    href={business.drive_folder_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open Drive
                                    <ExternalLink data-icon="inline-end" />
                                </a>
                            </Button>
                        )}
                        {canManage && (
                            <EditBusinessDialog business={business} />
                        )}
                        <AddContentDialog businessId={business.id} />
                        <AddTaskDialog businessId={business.id} users={users} />

                        {canManage && (
                            <>
                                <Button
                                    variant="outline"
                                    disabled={actionInProgress}
                                    onClick={handleToggleStatus}
                                    className={
                                        business.status === 'active'
                                            ? 'text-muted-foreground hover:text-amber-600'
                                            : 'text-emerald-600 hover:text-emerald-700'
                                    }
                                >
                                    {business.status === 'active' ? (
                                        <>
                                            <PowerOff className="size-4" />
                                            Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <Power className="size-4" />
                                            Activate
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={actionInProgress}
                                    onClick={() => setTrashOpen(true)}
                                    className="text-muted-foreground hover:border-destructive hover:text-destructive"
                                    title="Move to Recycle Bin"
                                >
                                    <Trash2 className="size-4" />
                                    Move to Trash
                                </Button>
                                {isOwner && (
                                    <Button
                                        variant="outline"
                                        disabled={actionInProgress}
                                        onClick={() => setForceDeleteOpen(true)}
                                        className="text-muted-foreground hover:border-destructive hover:text-destructive"
                                        title="Permanently delete workspace"
                                    >
                                        <Trash2 className="size-4" />
                                        Delete permanently
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <nav className="mt-6 flex gap-6 overflow-x-auto text-sm font-medium">
                    {tabs.map(({ label, badge }) => (
                        <button
                            key={label}
                            onClick={() => setActiveTab(label)}
                            className={
                                activeTab === label
                                    ? 'flex items-center gap-1.5 border-b-2 border-primary pb-3 whitespace-nowrap text-primary'
                                    : 'flex items-center gap-1.5 pb-3 whitespace-nowrap text-muted-foreground hover:text-foreground'
                            }
                        >
                            {label}
                            {badge !== undefined && (
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold ${
                                        activeTab === label
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </header>

            {/* ── OVERVIEW ── */}
            {activeTab === 'Overview' && (
                <main className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <section className="lumink-panel p-4">
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold">This month</h2>
                                {canManage && (
                                    <EditTargetsDialog business={business} />
                                )}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                                {(
                                    [
                                        'reels',
                                        'static',
                                        'carousel',
                                        'stories',
                                        'cinematic',
                                    ] as const
                                ).map((key) => {
                                    const value = delivered[key];
                                    const target = Number(targets[key] ?? 0);
                                    const percent = target
                                        ? Math.min(
                                              100,
                                              Math.round(
                                                  (value / target) * 100,
                                              ),
                                          )
                                        : 0;

                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between text-sm">
                                                <span>{humanize(key)}</span>
                                                <strong>
                                                    {value} / {target}
                                                </strong>
                                            </div>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{
                                                        width: `${percent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="lumink-panel overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Active campaigns
                                </h2>
                                <Target className="size-5 text-muted-foreground" />
                            </div>
                            {business.campaigns.map((campaign) => (
                                <div
                                    key={campaign.id}
                                    className="grid gap-4 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                                >
                                    <div>
                                        <p className="font-semibold">
                                            {campaign.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {campaign.objective}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="lumink-label">
                                            Target audience
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {campaign.target_audience}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="lumink-label">Budget</p>
                                        <p className="mt-1 text-sm">
                                            {money(campaign.budget)}
                                        </p>
                                    </div>
                                    <StatusBadge value={campaign.status} />
                                </div>
                            ))}
                        </section>

                        <section className="lumink-panel overflow-hidden">
                            <div className="border-b px-4 py-3">
                                <h2 className="font-semibold">Upcoming work</h2>
                            </div>
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Due</th>
                                        <th>Type</th>
                                        <th>Work</th>
                                        <th>Owner</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {business.tasks.map((task) => (
                                        <tr
                                            key={task.id}
                                            className="cursor-pointer transition-colors hover:bg-muted/50"
                                            onClick={() => setTaskToEdit(task)}
                                        >
                                            <td>{dateTime(task.due_at)}</td>
                                            <td>{humanize(task.type)}</td>
                                            <td className="font-medium">
                                                {task.title}
                                            </td>
                                            <td>
                                                {task.owner?.name ??
                                                    'Unassigned'}
                                            </td>
                                            <td
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <TaskStatusDropdown
                                                    taskId={task.id}
                                                    status={task.status}
                                                    taskTitle={task.title}
                                                />
                                            </td>
                                            <td
                                                className="text-right"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <TaskAdvanceButton
                                                        taskId={task.id}
                                                        status={task.status}
                                                    />
                                                    {(canManage || isOwner) && (
                                                        <DeleteTaskDialog
                                                            taskId={task.id}
                                                            taskTitle={
                                                                task.title
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {business.tasks.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-8 text-center text-sm text-muted-foreground"
                                            >
                                                No active tasks for this
                                                business.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {taskToEdit && (
                                <EditTaskDialog
                                    task={{
                                        ...taskToEdit,
                                        business_id: business.id,
                                        priority:
                                            taskToEdit.priority ?? 'medium',
                                    }}
                                    businesses={[
                                        {
                                            id: business.id,
                                            name: business.name,
                                        },
                                    ]}
                                    users={users}
                                    open={Boolean(taskToEdit)}
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setTaskToEdit(null);
                                        }
                                    }}
                                />
                            )}
                        </section>
                    </div>

                    <aside className="flex min-w-0 flex-col gap-5">
                        <section className="lumink-panel overflow-hidden">
                            <div className="border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Recent performance
                                </h2>
                            </div>
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Period</th>
                                        <th>Sales change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {business.performance_periods
                                        .slice(0, 4)
                                        .map((period) => (
                                            <tr key={period.id}>
                                                <td>
                                                    {shortDate(
                                                        period.starts_on,
                                                    )}{' '}
                                                    –{' '}
                                                    {shortDate(period.ends_on)}
                                                </td>
                                                <td className="font-semibold text-primary">
                                                    +
                                                    {
                                                        period.sales_change_percent
                                                    }
                                                    %
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </section>
                        <section className="lumink-panel p-4">
                            <h2 className="font-semibold">
                                Profitability snapshot
                            </h2>
                            <dl className="mt-4 flex flex-col gap-3 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Monthly retainer
                                    </dt>
                                    <dd>{money(business.monthly_retainer)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Direct expenses
                                    </dt>
                                    <dd>
                                        {money(profitability.directExpenses)}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Tracked hours
                                    </dt>
                                    <dd>
                                        {Math.round(
                                            profitability.trackedMinutes / 60,
                                        )}
                                        h
                                    </dd>
                                </div>
                                <div className="flex justify-between border-t pt-3 font-semibold">
                                    <dt>Estimated margin</dt>
                                    <dd className="text-primary">
                                        {money(profitability.margin)}
                                    </dd>
                                </div>
                            </dl>
                        </section>
                        <section className="lumink-panel overflow-hidden">
                            <div className="flex items-center gap-2 border-b px-4 py-3">
                                <CalendarDays className="size-4" />
                                <h2 className="font-semibold">
                                    Active content
                                </h2>
                            </div>
                            {business.content_items.slice(0, 6).map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/content/${item.id}`}
                                    className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {dateTime(item.publish_at)}
                                        </p>
                                    </div>
                                    <StatusBadge value={item.stage} />
                                </Link>
                            ))}
                        </section>
                    </aside>
                </main>
            )}

            {/* ── CONTENT ── */}
            {activeTab === 'Content' && (
                <main className="p-5">
                    <section className="lumink-panel overflow-hidden">
                        <table className="lumink-table">
                            <thead>
                                <tr>
                                    <th>Content</th>
                                    <th>Campaign</th>
                                    <th>Owner</th>
                                    <th>Publish</th>
                                    <th>Stage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {business.content_items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="cursor-pointer transition-colors hover:bg-muted/50"
                                        onClick={() =>
                                            router.visit(`/content/${item.id}`)
                                        }
                                    >
                                        <td>
                                            <p className="font-medium">
                                                {item.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {humanize(item.type)}
                                            </p>
                                        </td>
                                        <td>
                                            {business.campaigns.find((c) =>
                                                item.title.includes(c.name),
                                            )?.name ?? '—'}
                                        </td>
                                        <td>
                                            {item.owner?.name ?? 'Unassigned'}
                                        </td>
                                        <td>{dateTime(item.publish_at)}</td>
                                        <td>
                                            <StatusBadge value={item.stage} />
                                        </td>
                                    </tr>
                                ))}
                                {business.content_items.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            No content items yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                </main>
            )}

            {/* ── TASKS ── */}
            {activeTab === 'Tasks' && (
                <main className="p-5">
                    <section className="lumink-panel overflow-hidden">
                        <table className="lumink-table">
                            <thead>
                                <tr>
                                    <th>Due</th>
                                    <th>Type</th>
                                    <th>Task</th>
                                    <th>Owner</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {business.tasks.map((task) => (
                                    <tr key={task.id}>
                                        <td>{dateTime(task.due_at)}</td>
                                        <td>{humanize(task.type)}</td>
                                        <td className="font-medium">
                                            {task.title}
                                        </td>
                                        <td>
                                            {task.owner?.name ?? 'Unassigned'}
                                        </td>
                                        <td>
                                            <StatusBadge value={task.status} />
                                        </td>
                                    </tr>
                                ))}
                                {business.tasks.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            No tasks yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                </main>
            )}

            {/* ── CALENDAR ── */}
            {activeTab === 'Calendar' && (
                <main className="p-5">
                    <BusinessCalendar events={calendarEvents} />
                </main>
            )}

            {/* ── FILES ── */}
            {activeTab === 'Files' && (
                <main className="p-5">
                    <div className="flex flex-col gap-5">
                        {/* Business-level Drive folders */}
                        <section className="lumink-panel overflow-hidden">
                            <div className="flex items-center gap-2 border-b px-4 py-3">
                                <FolderOpen className="size-4" />
                                <h2 className="font-semibold">Drive folders</h2>
                            </div>
                            <div className="divide-y">
                                {business.drive_folder_url && (
                                    <a
                                        href={business.drive_folder_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                Main folder
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {business.name} — root
                                            </p>
                                        </div>
                                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                                    </a>
                                )}
                                {Object.entries(driveMap).map(([label, url]) =>
                                    url ? (
                                        <a
                                            key={label}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                                        >
                                            <p className="font-medium capitalize">
                                                {humanize(label)}
                                            </p>
                                            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                                        </a>
                                    ) : null,
                                )}
                                {!hasAnyDrive && (
                                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No Drive folders linked yet.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Content item Drive folders */}
                        {business.content_items.some(
                            (c) => c.drive_folder_url,
                        ) && (
                            <section className="lumink-panel overflow-hidden">
                                <div className="border-b px-4 py-3">
                                    <h2 className="font-semibold">
                                        Content folders
                                    </h2>
                                </div>
                                <div className="divide-y">
                                    {business.content_items
                                        .filter((c) => c.drive_folder_url)
                                        .map((item) => (
                                            <a
                                                key={item.id}
                                                href={item.drive_folder_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {humanize(item.type)} ·{' '}
                                                        {humanize(item.stage)}
                                                    </p>
                                                </div>
                                                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                                            </a>
                                        ))}
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            )}

            {/* ── PERFORMANCE ── */}
            {activeTab === 'Performance' && (
                <main className="p-5">
                    {business.performance_periods.length === 0 ? (
                        <section className="lumink-panel p-8 text-center text-muted-foreground">
                            <p className="text-lg font-medium text-foreground">
                                No performance data yet
                            </p>
                            <p className="mt-2">
                                Performance periods will appear here once added.
                            </p>
                        </section>
                    ) : (
                        <section className="lumink-panel overflow-hidden">
                            <div className="border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Performance periods
                                </h2>
                            </div>
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Period</th>
                                        <th>Duration</th>
                                        <th>Sales change</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {business.performance_periods.map(
                                        (period) => {
                                            const pct = parseFloat(
                                                period.sales_change_percent ??
                                                    '0',
                                            );

                                            return (
                                                <tr key={period.id}>
                                                    <td>
                                                        {shortDate(
                                                            period.starts_on,
                                                        )}{' '}
                                                        –{' '}
                                                        {shortDate(
                                                            period.ends_on,
                                                        )}
                                                    </td>
                                                    <td className="text-muted-foreground">
                                                        {Math.round(
                                                            (new Date(
                                                                period.ends_on,
                                                            ).getTime() -
                                                                new Date(
                                                                    period.starts_on,
                                                                ).getTime()) /
                                                                (1000 *
                                                                    60 *
                                                                    60 *
                                                                    24),
                                                        )}{' '}
                                                        days
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`flex items-center gap-1 font-semibold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                                                        >
                                                            {pct >= 0 ? (
                                                                <TrendingUp className="size-3.5" />
                                                            ) : (
                                                                <TrendingDown className="size-3.5" />
                                                            )}
                                                            {pct >= 0
                                                                ? '+'
                                                                : ''}
                                                            {
                                                                period.sales_change_percent
                                                            }
                                                            %
                                                        </span>
                                                    </td>
                                                    <td className="text-sm text-muted-foreground">
                                                        {period.notes ?? '—'}
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </section>
                    )}
                </main>
            )}

            {/* ── FINANCE ── */}
            {activeTab === 'Finance' && (
                <main className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
                    {/* Invoices */}
                    <section className="lumink-panel overflow-hidden">
                        <div className="border-b px-4 py-3">
                            <h2 className="font-semibold">Invoices</h2>
                        </div>
                        {(business.invoices ?? []).length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No invoices yet.
                            </p>
                        ) : (
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Issued</th>
                                        <th>Due</th>
                                        <th className="text-right">Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(business.invoices ?? []).map((inv) => (
                                        <tr key={inv.id}>
                                            <td className="font-medium">
                                                {inv.number}
                                            </td>
                                            <td>{shortDate(inv.issue_date)}</td>
                                            <td>{shortDate(inv.due_date)}</td>
                                            <td className="text-right font-semibold">
                                                {money(inv.total)}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    value={inv.status}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    {/* Finance summary + expenses */}
                    <div className="flex flex-col gap-5">
                        <section className="lumink-panel p-4">
                            <h2 className="font-semibold">Summary</h2>
                            <dl className="mt-4 flex flex-col gap-3 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Total invoiced
                                    </dt>
                                    <dd className="font-medium">
                                        {money(totalInvoiced)}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Total received
                                    </dt>
                                    <dd className="font-medium text-emerald-600">
                                        {money(totalPaid)}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Outstanding
                                    </dt>
                                    <dd className="font-medium text-amber-600">
                                        {money(totalInvoiced - totalPaid)}
                                    </dd>
                                </div>
                                <div className="flex justify-between border-t pt-3">
                                    <dt className="text-muted-foreground">
                                        Direct expenses
                                    </dt>
                                    <dd className="font-medium text-red-600">
                                        {money(totalExpenses)}
                                    </dd>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <dt>Net margin</dt>
                                    <dd
                                        className={
                                            totalPaid - totalExpenses >= 0
                                                ? 'text-emerald-600'
                                                : 'text-red-600'
                                        }
                                    >
                                        {money(totalPaid - totalExpenses)}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <section className="lumink-panel overflow-hidden">
                            <div className="border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Direct expenses
                                </h2>
                            </div>
                            {(business.expenses ?? []).length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    No expenses recorded.
                                </p>
                            ) : (
                                <table className="lumink-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th className="text-right">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(business.expenses ?? []).map((ex) => (
                                            <tr key={ex.id}>
                                                <td>
                                                    {shortDate(ex.spent_on)}
                                                </td>
                                                <td>{humanize(ex.category)}</td>
                                                <td className="text-right font-medium">
                                                    {money(ex.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </div>
                </main>
            )}

            {/* Move to Trash Confirmation Dialog */}
            <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Move workspace to Recycle Bin?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to move{' '}
                            <strong>{business.name}</strong> to the Recycle Bin?
                            <br />
                            <br />
                            The workspace will be deactivated and hidden from
                            daily operations, active task queues, and revenue
                            reports. All campaigns, tasks, and data remain
                            intact and can be restored at any time.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setTrashOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmMoveToTrash}
                            disabled={actionInProgress}
                        >
                            Move to Recycle Bin
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Permanent Force Delete Confirmation Dialog */}
            <Dialog open={forceDeleteOpen} onOpenChange={setForceDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Permanently delete workspace?
                        </DialogTitle>
                        <DialogDescription className="space-y-2">
                            <p>
                                Are you sure you want to completely delete{' '}
                                <strong>{business.name}</strong>?
                            </p>
                            <p className="rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">
                                <strong>WARNING:</strong> This action cannot be
                                undone. This will permanently erase the business
                                workspace and all associated campaigns, content
                                items, tasks, invoice records, and performance
                                reports.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setForceDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmForceDelete}
                            disabled={actionInProgress}
                        >
                            Permanently delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
