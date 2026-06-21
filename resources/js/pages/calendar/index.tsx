import { Head } from '@inertiajs/react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import { dateTime, humanize, shortDate } from '@/lib/format';

type Task = {
    id: number;
    title: string;
    type: string;
    status: string;
    due_at: string;
    business?: { name: string };
};

export default function Calendar({ tasks }: { tasks: Task[] }) {
    const groups = tasks.reduce<Record<string, Task[]>>((result, task) => {
        const key = new Date(task.due_at).toISOString().slice(0, 10);
        result[key] = [...(result[key] ?? []), task];

        return result;
    }, {});

    return (
        <>
            <Head title="Calendar" />
            <PageHeading
                title="Calendar"
                description="Internal source of truth for shoots, deadlines, approvals, and publishing."
            />
            <main className="grid gap-5 p-5 lg:grid-cols-2">
                {Object.entries(groups).map(([date, dayTasks]) => (
                    <section
                        key={date}
                        className="lumink-panel overflow-hidden"
                    >
                        <div className="flex items-center gap-2 border-b px-4 py-3">
                            <CalendarDays className="size-5 text-primary" />
                            <h2 className="font-semibold">{shortDate(date)}</h2>
                        </div>
                        {dayTasks.map((task) => (
                            <div
                                key={task.id}
                                className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-4 last:border-b-0"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Clock3 className="size-4 text-muted-foreground" />
                                        <p className="font-medium">
                                            {task.title}
                                        </p>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {dateTime(task.due_at)} ·{' '}
                                        {task.business?.name ?? 'Agency'} ·{' '}
                                        {humanize(task.type)}
                                    </p>
                                </div>
                                <StatusBadge value={task.status} />
                            </div>
                        ))}
                    </section>
                ))}
            </main>
        </>
    );
}
