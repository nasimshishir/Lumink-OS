import { Head } from '@inertiajs/react';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { PageHeading } from '@/components/page-heading';
import {
    TaskAdvanceButton,
    TaskStatusDropdown,
} from '@/components/task-status-control';
import { dateTime, humanize } from '@/lib/format';

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
    business?: { id: number; name: string } | null;
    owner_id?: number | null;
    owner?: { id: number; name: string } | null;
    content_item?: { title: string };
};

type Option = { id: number; name: string };

export default function MyWork({
    tasks,
    businesses = [],
    users = [],
    canManage = false,
    isOwner = false,
}: {
    tasks: Task[];
    businesses?: Option[];
    users?: Option[];
    canManage?: boolean;
    isOwner?: boolean;
}) {
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
                                <th className="text-right">Actions</th>
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
                                        {Math.round(
                                            (task.estimate_minutes ?? 0) / 60,
                                        )}
                                        h
                                    </td>
                                    <td>
                                        <TaskStatusDropdown
                                            taskId={task.id}
                                            status={task.status}
                                            taskTitle={task.title}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <TaskAdvanceButton
                                                taskId={task.id}
                                                status={task.status}
                                            />
                                            <EditTaskDialog
                                                task={task}
                                                businesses={businesses}
                                                users={users}
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
                                        colSpan={7}
                                        className="py-12 text-center text-sm text-muted-foreground"
                                    >
                                        No active tasks assigned to you. Enjoy
                                        your day!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>
            </main>
        </>
    );
}
