import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    FileWarning,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import {
    TaskAdvanceButton,
    TaskStatusDropdown,
} from '@/components/task-status-control';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { dateTime, humanize, money } from '@/lib/format';

type Person = { id: number; name: string; avatar?: string };
type Business = { id: number; name: string; slug?: string };
type Task = {
    id: number;
    title: string;
    description?: string | null;
    type: string;
    status: string;
    priority: string;
    due_at?: string | null;
    estimate_minutes?: number | null;
    actual_minutes?: number | null;
    business_id?: number | null;
    business?: Business | null;
    owner_id?: number | null;
    owner?: Person | null;
};
type Content = {
    id: number;
    title: string;
    stage: string;
    publish_at?: string;
    business: Business;
};

export default function Today({
    tasks,
    summary,
    contentProgress,
    activeContent,
    finance,
    activity,
    businesses,
    users,
    canCreateTasks,
    canManage = false,
    isOwner = false,
}: {
    tasks: Task[];
    summary: {
        attention: number;
        today: number;
        week: number;
        completed: number;
    };
    contentProgress: Record<string, number>;
    activeContent: Content[];
    finance: {
        revenue: number;
        directCosts: number;
        outstanding: number;
        hiringThreshold: number;
    } | null;
    activity: { id: number; event: string; created_at: string }[];
    businesses: Person[];
    users: Person[];
    canCreateTasks: boolean;
    canManage?: boolean;
    isOwner?: boolean;
}) {
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const progress = finance
        ? Math.min(
              100,
              Math.round((finance.revenue / finance.hiringThreshold) * 100),
          )
        : 0;
    const stages = [
        'planned',
        'scripted',
        'shot',
        'editing',
        'client_review',
        'approved',
        'published',
    ];
    const metrics: { icon: LucideIcon; value: number; label: string }[] = [
        {
            icon: AlertCircle,
            value: summary.attention,
            label: 'Needs attention',
        },
        { icon: CalendarClock, value: summary.today, label: 'Scheduled today' },
        { icon: Clock3, value: summary.week, label: 'Due this week' },
        {
            icon: CheckCircle2,
            value: summary.completed,
            label: 'Completed today',
        },
    ];

    return (
        <>
            <Head title="Today" />
            <PageHeading
                title="Today"
                description={new Intl.DateTimeFormat('en-BD', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                }).format(new Date())}
                actions={
                    canCreateTasks ? (
                        <AddTaskDialog businesses={businesses} users={users} />
                    ) : undefined
                }
            />
            <main className="flex flex-col gap-5 p-5">
                <section className="lumink-panel grid grid-cols-2 divide-x divide-y overflow-hidden sm:grid-cols-4 sm:divide-y-0">
                    {metrics.map(({ icon: Icon, value, label }) => (
                        <div
                            key={label}
                            className="flex items-center gap-3 px-4 py-4"
                        >
                            <Icon className="size-5 text-primary" />
                            <div>
                                <p className="text-xl font-semibold">{value}</p>
                                <p className="text-xs text-muted-foreground">
                                    {label}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="lumink-panel overflow-hidden">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="size-5 text-destructive" />
                            <h2 className="font-semibold">Needs attention</h2>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {tasks.length} open items
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="lumink-table w-full">
                            <thead>
                                <tr>
                                    <th className="w-[34%] min-w-[280px]">
                                        Task / content
                                    </th>
                                    <th className="w-[16%] min-w-[130px]">
                                        Business
                                    </th>
                                    <th className="w-[16%] min-w-[130px]">
                                        Owner
                                    </th>
                                    <th className="w-[12%] min-w-[110px]">
                                        Due
                                    </th>
                                    <th className="w-[14%] min-w-[130px]">
                                        Priority / status
                                    </th>
                                    <th className="w-[8%] min-w-[90px] text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.slice(0, 8).map((task) => (
                                    <tr
                                        key={task.id}
                                        className="cursor-pointer transition-colors hover:bg-muted/50"
                                        onClick={() => setTaskToEdit(task)}
                                    >
                                        <td className="py-3 pr-4">
                                            <p
                                                className="line-clamp-2 font-medium text-foreground"
                                                title={task.title}
                                            >
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {humanize(task.type)}
                                            </p>
                                        </td>
                                        <td>
                                            {task.business
                                                ? task.business.name
                                                : 'Agency'}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="size-7">
                                                    <AvatarImage
                                                        src={task.owner?.avatar}
                                                    />
                                                    <AvatarFallback>
                                                        {task.owner?.name?.slice(
                                                            0,
                                                            2,
                                                        ) ?? '—'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">
                                                    {task.owner?.name ??
                                                        'Unassigned'}
                                                </span>
                                            </div>
                                        </td>
                                        <td
                                            className={
                                                task.due_at &&
                                                new Date(task.due_at) <
                                                    new Date()
                                                    ? 'font-medium text-destructive'
                                                    : ''
                                            }
                                        >
                                            {dateTime(task.due_at)}
                                        </td>
                                        <td
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <StatusBadge
                                                    value={task.priority}
                                                />
                                                <TaskStatusDropdown
                                                    taskId={task.id}
                                                    status={task.status}
                                                    taskTitle={task.title}
                                                />
                                            </div>
                                        </td>
                                        <td
                                            className="text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-end gap-1.5">
                                                <TaskAdvanceButton
                                                    taskId={task.id}
                                                    status={task.status}
                                                />
                                                {(canManage || isOwner) && (
                                                    <DeleteTaskDialog
                                                        taskId={task.id}
                                                        taskTitle={task.title}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {tasks.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-10 text-center text-sm text-muted-foreground"
                                        >
                                            No items requiring immediate
                                            attention. All caught up!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,1fr)]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <section className="lumink-panel overflow-hidden">
                            <div className="border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Today’s schedule
                                </h2>
                            </div>
                            {tasks
                                .filter(
                                    (task) =>
                                        task.due_at &&
                                        new Date(task.due_at).toDateString() ===
                                            new Date().toDateString(),
                                )
                                .map((task) => (
                                    <div
                                        key={task.id}
                                        className="grid cursor-pointer gap-2 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50 sm:grid-cols-[120px_1fr_180px_auto] sm:items-center"
                                        onClick={() => setTaskToEdit(task)}
                                    >
                                        <span className="text-sm font-medium">
                                            {dateTime(task.due_at)
                                                .split(',')
                                                .at(-1)}
                                        </span>
                                        <div>
                                            <p className="font-medium">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {task.business?.name ??
                                                    'Agency'}
                                            </p>
                                        </div>
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <TaskStatusDropdown
                                                taskId={task.id}
                                                status={task.status}
                                                taskTitle={task.title}
                                            />
                                        </div>
                                        <div
                                            className="flex items-center justify-end gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <TaskAdvanceButton
                                                taskId={task.id}
                                                status={task.status}
                                            />
                                            {(canManage || isOwner) && (
                                                <DeleteTaskDialog
                                                    taskId={task.id}
                                                    taskTitle={task.title}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            {tasks.filter(
                                (task) =>
                                    task.due_at &&
                                    new Date(task.due_at).toDateString() ===
                                        new Date().toDateString(),
                            ).length === 0 && (
                                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    No tasks scheduled for today.
                                </p>
                            )}
                        </section>

                        <section className="lumink-panel p-4">
                            <div className="flex items-center gap-2">
                                <FileWarning className="size-5 text-primary" />
                                <h2 className="font-semibold">
                                    Recent activity
                                </h2>
                            </div>
                            <div className="mt-3 flex flex-col gap-3">
                                {activity.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex gap-3 text-sm"
                                    >
                                        <span className="mt-1.5 size-2 rounded-full bg-primary" />
                                        <div>
                                            <p>{humanize(event.event)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {dateTime(event.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="flex min-w-0 flex-col gap-5">
                        <section className="lumink-panel overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Active content
                                </h2>
                                <Link
                                    className="text-xs font-semibold text-primary"
                                    href="/content"
                                >
                                    View all
                                </Link>
                            </div>
                            {activeContent.map((item) => (
                                <Link
                                    href={`/content/${item.id}`}
                                    key={item.id}
                                    className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.business.name} ·{' '}
                                            {dateTime(item.publish_at)}
                                        </p>
                                    </div>
                                    <StatusBadge value={item.stage} />
                                </Link>
                            ))}
                        </section>

                        {finance && (
                            <section className="lumink-panel p-4">
                                <h2 className="font-semibold">
                                    Content production progress
                                </h2>
                                <div className="mt-5 grid grid-cols-7 gap-1">
                                    {stages.map((stage, index) => (
                                        <div
                                            key={stage}
                                            className="text-center"
                                        >
                                            <div
                                                className={`mx-auto flex size-8 items-center justify-center rounded-full border text-xs font-semibold ${index < 4 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                                            >
                                                {contentProgress[stage] ?? 0}
                                            </div>
                                            <p className="mt-2 truncate text-[10px] text-muted-foreground">
                                                {humanize(stage)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {finance && (
                            <section className="lumink-panel p-4">
                                <div className="flex items-center gap-2">
                                    <CircleDollarSign className="size-5 text-primary" />
                                    <h2 className="font-semibold">
                                        Monthly financial pulse
                                    </h2>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="lumink-label">Revenue</p>
                                        <p className="mt-1 font-semibold">
                                            {money(finance?.revenue ?? 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="lumink-label">
                                            Direct costs
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {money(finance?.directCosts ?? 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="lumink-label">
                                            Outstanding
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {money(finance?.outstanding ?? 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="lumink-label">
                                            Hiring threshold
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {money(
                                                finance?.hiringThreshold ?? 0,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full bg-primary"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {progress}% of hiring threshold
                                </p>
                            </section>
                        )}
                    </aside>
                </div>

                {taskToEdit && (
                    <EditTaskDialog
                        task={taskToEdit}
                        businesses={businesses}
                        users={users}
                        open={Boolean(taskToEdit)}
                        onOpenChange={(open) => {
                            if (!open) {
                                setTaskToEdit(null);
                            }
                        }}
                    />
                )}
            </main>
        </>
    );
}
