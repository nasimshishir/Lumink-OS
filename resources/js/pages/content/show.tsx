import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    Clipboard,
    ExternalLink,
    Link2,
    Play,
    Timer,
    Video,
} from 'lucide-react';
import { useState } from 'react';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { EditContentDetailsDialog } from '@/components/edit-content-details-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { dateTime, humanize } from '@/lib/format';

type PlatformVersion = {
    id: number;
    platform: string;
    caption?: string;
    format?: string;
    status: string;
    publish_at?: string;
};
type Task = {
    id: number;
    title: string;
    status: string;
    due_at?: string;
    estimate_minutes: number;
    actual_minutes: number;
    owner?: { name: string };
};
type Approval = {
    id: number;
    status: string;
    expires_at: string;
    responded_at?: string;
    version: number;
    responses: {
        id: number;
        client_name: string;
        action: string;
        comment?: string;
    }[];
    token?: string;
};
type Content = {
    id: number;
    title: string;
    type: string;
    stage: string;
    priority: string;
    brief?: string;
    hook?: string;
    script?: string;
    cta?: string;
    target_audience?: string;
    featured_items?: string[];
    shoot_notes?: string;
    publish_at?: string;
    revision_number: number;
    business: { id: number; name: string; drive_folder_url?: string };
    campaign?: { name: string };
    owner?: { name: string };
    platform_versions: PlatformVersion[];
    tasks: Task[];
    approvals: Approval[];
};

export default function ContentShow({
    content,
    stages,
    users,
}: {
    content: Content;
    stages: string[];
    users: { id: number; name: string; avatar?: string }[];
}) {
    const [platform, setPlatform] = useState(
        content.platform_versions[0]?.platform ?? 'instagram',
    );
    const currentVersion = content.platform_versions.find(
        (item) => item.platform === platform,
    );
    const latestApproval = content.approvals[0];
    const totalEstimate = content.tasks.reduce(
        (sum, task) => sum + task.estimate_minutes,
        0,
    );
    const totalActual = content.tasks.reduce(
        (sum, task) => sum + task.actual_minutes,
        0,
    );

    function moveTo(stage: string) {
        router.patch(
            `/content/${content.id}`,
            { stage },
            { preserveScroll: true },
        );
    }

    function createApproval() {
        router.post(
            `/content/${content.id}/approvals`,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const url = (
                        page.props.flash as
                            | { approval_url?: string }
                            | undefined
                    )?.approval_url;

                    if (url) {
                        navigator.clipboard.writeText(url);
                    }
                },
            },
        );
    }

    return (
        <>
            <Head title={content.title} />
            <header className="border-b bg-white px-5 py-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link href={`/businesses/${content.business.id}`}>
                        {content.business.name}
                    </Link>
                    <span>/</span>
                    <Link href="/content">Content</Link>
                    <span>/</span>
                    <span>{content.title}</span>
                </div>
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">
                                {content.title}
                            </h1>
                            <StatusBadge value={content.type} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <span>
                                Campaign:{' '}
                                <strong className="text-foreground">
                                    {content.campaign?.name ?? 'Unassigned'}
                                </strong>
                            </span>
                            <span>
                                Publish:{' '}
                                <strong className="text-foreground">
                                    {dateTime(content.publish_at)}
                                </strong>
                            </span>
                            <span>
                                Owner:{' '}
                                <strong className="text-foreground">
                                    {content.owner?.name ?? 'Unassigned'}
                                </strong>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={createApproval}>
                            <Link2 data-icon="inline-start" />
                            Send approval link
                        </Button>
                        <Button onClick={() => moveTo('approved')}>
                            <Check data-icon="inline-start" />
                            Mark approved
                        </Button>
                    </div>
                </div>
                <div className="mt-6 flex overflow-x-auto pb-1">
                    {stages.map((stage, index) => {
                        const current = stages.indexOf(content.stage);
                        const complete = index <= current;

                        return (
                            <button
                                key={stage}
                                onClick={() => moveTo(stage)}
                                className="group min-w-24 flex-1 text-center"
                            >
                                <span
                                    className={`mx-auto flex size-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white text-muted-foreground group-hover:border-primary'}`}
                                >
                                    {index + 1}
                                </span>
                                <span className="mt-2 block text-[10px]">
                                    {humanize(stage)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </header>

            <main className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
                <div className="flex min-w-0 flex-col gap-5">
                    <section className="lumink-panel overflow-hidden">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <h2 className="font-semibold">Brief & details</h2>
                            <EditContentDetailsDialog content={content} />
                        </div>
                        <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="flex flex-col gap-5 p-4">
                                {[
                                    ['Content brief', content.brief],
                                    ['Hook', content.hook],
                                    ['Script / caption master', content.script],
                                    ['Call to action', content.cta],
                                    [
                                        'Target audience',
                                        content.target_audience,
                                    ],
                                    ['Shoot notes', content.shoot_notes],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="lumink-label">{label}</p>
                                        <p className="mt-1 text-sm leading-6">
                                            {value || 'Not added yet.'}
                                        </p>
                                    </div>
                                ))}
                                <div>
                                    <p className="lumink-label">
                                        Featured menu items
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {content.featured_items?.map((item) => (
                                            <span
                                                key={item}
                                                className="rounded-md border px-2 py-1 text-xs"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="border-t p-4 md:border-t-0 md:border-l">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">
                                        Production checklist
                                    </h3>
                                    <span className="text-xs text-muted-foreground">
                                        {stages.indexOf(content.stage) + 1}/
                                        {stages.length}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-col gap-3">
                                    {stages.map((stage, index) => (
                                        <div
                                            key={stage}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            {index <=
                                            stages.indexOf(content.stage) ? (
                                                <Check className="size-4 text-primary" />
                                            ) : (
                                                <span className="size-4 rounded-full border" />
                                            )}
                                            <span>{humanize(stage)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="lumink-panel overflow-hidden">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <h2 className="font-semibold">
                                Assigned production tasks
                            </h2>
                            <AddTaskDialog
                                businessId={content.business.id}
                                contentId={content.id}
                                users={users}
                            />
                        </div>
                        <table className="lumink-table">
                            <thead>
                                <tr>
                                    <th>Task</th>
                                    <th>Assignee</th>
                                    <th>Status</th>
                                    <th>Due</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.tasks.map((task) => (
                                    <tr key={task.id}>
                                        <td className="font-medium">
                                            {task.title}
                                        </td>
                                        <td>
                                            {task.owner?.name ?? 'Unassigned'}
                                        </td>
                                        <td>
                                            <StatusBadge value={task.status} />
                                        </td>
                                        <td>{dateTime(task.due_at)}</td>
                                        <td>
                                            {Math.round(
                                                task.actual_minutes / 60,
                                            )}
                                            h /{' '}
                                            {Math.round(
                                                task.estimate_minutes / 60,
                                            )}
                                            h
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="grid grid-cols-3 border-t bg-muted/30 px-4 py-3 text-sm">
                            <div>
                                <p className="lumink-label">Estimate</p>
                                <p className="mt-1 font-semibold">
                                    {Math.round(totalEstimate / 60)}h
                                </p>
                            </div>
                            <div>
                                <p className="lumink-label">Logged</p>
                                <p className="mt-1 font-semibold">
                                    {Math.round(totalActual / 60)}h
                                </p>
                            </div>
                            <div>
                                <p className="lumink-label">Remaining</p>
                                <p className="mt-1 font-semibold">
                                    {Math.max(
                                        0,
                                        Math.round(
                                            (totalEstimate - totalActual) / 60,
                                        ),
                                    )}
                                    h
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="flex min-w-0 flex-col gap-5">
                    <section className="lumink-panel p-3">
                        <div className="flex border-b">
                            {content.platform_versions.map((version) => (
                                <button
                                    key={version.id}
                                    onClick={() =>
                                        setPlatform(version.platform)
                                    }
                                    className={`flex-1 border-b-2 px-2 py-2 text-xs font-semibold capitalize ${platform === version.platform ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                                >
                                    {version.platform}
                                </button>
                            ))}
                        </div>
                        <div className="relative mx-auto mt-3 aspect-[9/16] max-h-[520px] overflow-hidden rounded-md bg-black">
                            <img
                                src="/images/eid-offer-cover.png"
                                alt="Eid offer food campaign preview"
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 top-0 bg-black/45 p-5 text-center text-white">
                                <p className="text-sm font-semibold tracking-[0.16em]">
                                    EID MUBARAK
                                </p>
                                <p className="mt-1 text-xs">
                                    Celebrate with us
                                </p>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-black/55 p-4 text-white">
                                <p className="text-center text-2xl font-bold text-[#f4c34e]">
                                    15% OFF
                                </p>
                                <div className="mt-3 flex items-center justify-between text-xs">
                                    <span>0:00 / 0:15</span>
                                    <Play className="size-4" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="lumink-label">Platform caption</p>
                            <p className="mt-1 text-sm">
                                {currentVersion?.caption ||
                                    'No platform caption yet.'}
                            </p>
                        </div>
                    </section>

                    <section className="lumink-panel p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Assets</h2>
                            {content.business.drive_folder_url && (
                                <Button asChild variant="ghost" size="sm">
                                    <a
                                        href={content.business.drive_folder_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open Drive
                                        <ExternalLink data-icon="inline-end" />
                                    </a>
                                </Button>
                            )}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            {[
                                'Footage – Eid Offer Reel',
                                'Audio – Background music',
                                'Graphics & logo',
                            ].map((asset) => (
                                <div
                                    key={asset}
                                    className="flex items-center gap-3 rounded-md border p-3"
                                >
                                    <Video className="size-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {asset}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Google Drive metadata
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="lumink-panel p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Approval details</h2>
                            <StatusBadge
                                value={latestApproval?.status ?? 'not_sent'}
                            />
                        </div>
                        <dl className="mt-4 flex flex-col gap-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    Version
                                </dt>
                                <dd>
                                    v
                                    {latestApproval?.version ??
                                        content.revision_number}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    Expires
                                </dt>
                                <dd>{dateTime(latestApproval?.expires_at)}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    Response
                                </dt>
                                <dd>
                                    {latestApproval?.responses[0]
                                        ?.client_name ?? 'Pending'}
                                </dd>
                            </div>
                        </dl>
                        {latestApproval && (
                            <Button
                                asChild
                                variant="outline"
                                className="mt-4 w-full"
                            >
                                <a
                                    href={`/approve/${latestApproval.token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Clipboard data-icon="inline-start" />
                                    Open approval preview
                                </a>
                            </Button>
                        )}
                    </section>
                    <section className="lumink-panel flex items-center gap-3 p-4">
                        <Timer className="size-5 text-primary" />
                        <div>
                            <p className="text-sm font-semibold">
                                Revision {content.revision_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Approved versions are locked; changes create a
                                new revision.
                            </p>
                        </div>
                    </section>
                </aside>
            </main>
        </>
    );
}
