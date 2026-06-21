import { Head, router } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { dateTime, humanize } from '@/lib/format';

type Task = {
    id: number;
    title: string;
    type: string;
    status: string;
    priority: string;
    due_at?: string;
    estimate_minutes: number;
    actual_minutes: number;
    business?: { name: string };
    content_item?: { title: string };
};

export default function MyWork({ tasks }: { tasks: Task[] }) {
    return (
        <>
            <Head title="My Work" />
            <PageHeading
                title="My Work"
                description="Your assigned tasks, deadlines, estimates, and logged time."
            />
            <main className="p-5">
                <section className="lumink-panel overflow-hidden">
                    <table className="lumink-table">
                        <thead>
                            <tr>
                                <th>Task</th>
                                <th>Business</th>
                                <th>Type</th>
                                <th>Due</th>
                                <th>Estimate</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr key={task.id}>
                                    <td>
                                        <p className="font-medium">
                                            {task.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {task.content_item?.title}
                                        </p>
                                    </td>
                                    <td>{task.business?.name ?? 'Agency'}</td>
                                    <td>{humanize(task.type)}</td>
                                    <td>{dateTime(task.due_at)}</td>
                                    <td>
                                        {Math.round(task.estimate_minutes / 60)}
                                        h
                                    </td>
                                    <td>
                                        <StatusBadge value={task.status} />
                                    </td>
                                    <td>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.patch(
                                                    `/tasks/${task.id}`,
                                                    { status: 'done' },
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <CheckCircle2 data-icon="inline-start" />
                                            Done
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
