import { Head, Link } from '@inertiajs/react';
import { CalendarDays, ExternalLink, Plus, Target } from 'lucide-react';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
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
};
type Task = {
    id: number;
    title: string;
    type: string;
    due_at?: string;
    status: string;
    owner?: { name: string };
};
type Period = {
    id: number;
    starts_on: string;
    ends_on: string;
    sales_change_percent?: string;
    notes?: string;
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
    deliverable_targets?: Record<string, number>;
    campaigns: Campaign[];
    content_items: Content[];
    tasks: Task[];
    performance_periods: Period[];
};

export default function BusinessShow({
    business,
    profitability,
}: {
    business: Business;
    profitability: {
        directExpenses: number;
        trackedMinutes: number;
        margin: number;
    };
}) {
    const targets = business.deliverable_targets ?? {};
    const delivered = {
        reels: business.content_items.filter((item) => item.type === 'reel')
            .length,
        stories: business.content_items.filter((item) => item.type === 'story')
            .length,
        static: business.content_items.filter((item) => item.type === 'static')
            .length,
    };

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
                        <Button asChild variant="outline">
                            <Link href="/content">
                                <Plus data-icon="inline-start" />
                                Add content
                            </Link>
                        </Button>
                        <AddTaskDialog businessId={business.id} />
                    </div>
                </div>
                <nav className="mt-6 flex gap-6 overflow-x-auto text-sm font-medium">
                    {[
                        'Overview',
                        'Content',
                        'Tasks',
                        'Calendar',
                        'Files',
                        'Performance',
                        'Finance',
                    ].map((tab, index) => (
                        <span
                            key={tab}
                            className={
                                index === 0
                                    ? 'border-b-2 border-primary pb-3 text-primary'
                                    : 'pb-3 text-muted-foreground'
                            }
                        >
                            {tab}
                        </span>
                    ))}
                </nav>
            </header>

            <main className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                <div className="flex min-w-0 flex-col gap-5">
                    <section className="lumink-panel p-4">
                        <h2 className="font-semibold">This month</h2>
                        <div className="mt-4 grid gap-5 md:grid-cols-3">
                            {(['reels', 'stories', 'static'] as const).map(
                                (key) => {
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
                                },
                            )}
                        </div>
                    </section>

                    <section className="lumink-panel overflow-hidden">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <h2 className="font-semibold">Active campaigns</h2>
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
                            </tbody>
                        </table>
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
                                {business.performance_periods.map((period) => (
                                    <tr key={period.id}>
                                        <td>
                                            {shortDate(period.starts_on)} –{' '}
                                            {shortDate(period.ends_on)}
                                        </td>
                                        <td className="font-semibold text-primary">
                                            +{period.sales_change_percent}%
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
                                <dd>{money(profitability.directExpenses)}</dd>
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
                            <h2 className="font-semibold">Active content</h2>
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
        </>
    );
}
