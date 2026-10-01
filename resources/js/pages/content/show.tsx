import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    Clipboard,
    Edit2,
    ExternalLink,
    Link2,
    Timer,
} from 'lucide-react';
import { useState } from 'react';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { ContentMediaPreview } from '@/components/content-media-preview';
import { DeleteContentDialog } from '@/components/delete-content-dialog';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { EditContentDetailsDialog } from '@/components/edit-content-details-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { StatusBadge } from '@/components/status-badge';
import {
    TaskAdvanceButton,
    TaskStatusDropdown,
} from '@/components/task-status-control';
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
    description?: string | null;
    status: string;
    type?: string;
    priority?: string;
    due_at?: string | null;
    estimate_minutes: number;
    actual_minutes: number;
    owner_id?: number | null;
    owner?: { id?: number; name: string } | null;
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
type Shoot = {
    id: number;
    title: string;
    starts_at: string;
    location?: string | null;
    drive_folder_url?: string | null;
    broll_tags?: string[] | null;
    footage_summary?: string | null;
};

type Content = {
    id: number;
    title: string;
    type: string;
    stage: string;
    priority: string;
    primary_shoot_id?: number | null;
    primary_shoot?: Shoot | null;
    referenced_shoot_ids?: number[] | null;
    brief?: string;
    hook?: string;
    script?: string;
    cta?: string;
    target_audience?: string;
    featured_items?: string[];
    shoot_notes?: string;
    thumbnail_url?: string | null;
    drive_folder_url?: string;
    raw_footage_url?: string;
    final_asset_url?: string;
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
    referencedShoots = [],
    availableShoots = [],
    users = [],
    canManage = false,
    isOwner = false,
}: {
    content: Content;
    stages: string[];
    referencedShoots?: Shoot[];
    availableShoots?: Shoot[];
    users?: { id: number; name: string; avatar?: string }[];
    canManage?: boolean;
    isOwner?: boolean;
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
                        <EditContentDetailsDialog
                            content={content}
                            users={users}
                            trigger={
                                <Button variant="outline">
                                    <Edit2 data-icon="inline-start" />
                                    Edit content
                                </Button>
                            }
                        />
                        <Button variant="outline" onClick={createApproval}>
                            <Link2 data-icon="inline-start" />
                            Send approval link
                        </Button>
                        <Button onClick={() => moveTo('approved')}>
                            <Check data-icon="inline-start" />
                            Mark approved
                        </Button>
                        {(canManage || isOwner) && (
                            <DeleteContentDialog
                                contentId={content.id}
                                contentTitle={content.title}
                            />
                        )}
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
                            <EditContentDetailsDialog
                                content={content}
                                users={users}
                            />
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
                                    <th className="text-right">Actions</th>
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
                                            <TaskStatusDropdown
                                                taskId={task.id}
                                                status={task.status}
                                                taskTitle={task.title}
                                            />
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
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <TaskAdvanceButton
                                                    taskId={task.id}
                                                    status={task.status}
                                                />
                                                <EditTaskDialog
                                                    task={{
                                                        ...task,
                                                        type:
                                                            task.type ??
                                                            'general',
                                                        priority:
                                                            task.priority ??
                                                            'medium',
                                                        business_id:
                                                            content.business.id,
                                                        content_item: {
                                                            id: content.id,
                                                            title: content.title,
                                                            drive_folder_url:
                                                                content.drive_folder_url,
                                                            raw_footage_url:
                                                                content.raw_footage_url,
                                                            final_asset_url:
                                                                content.final_asset_url,
                                                            primary_shoot:
                                                                content.primary_shoot,
                                                            referenced_shoots:
                                                                referencedShoots,
                                                        },
                                                    }}
                                                    businesses={[
                                                        {
                                                            id: content.business
                                                                .id,
                                                            name: content
                                                                .business.name,
                                                        },
                                                    ]}
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
                                {content.tasks.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-6 text-center text-sm text-muted-foreground"
                                        >
                                            No tasks assigned for this content
                                            item.
                                        </td>
                                    </tr>
                                )}
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
                        <div className="mt-3">
                            <ContentMediaPreview
                                title={content.title}
                                type={content.type}
                                stage={content.stage}
                                thumbnailUrl={content.thumbnail_url}
                                finalAssetUrl={content.final_asset_url}
                                rawFootageUrl={content.raw_footage_url}
                                driveFolderUrl={content.drive_folder_url}
                                hook={content.hook}
                                actionTrigger={
                                    <EditContentDetailsDialog
                                        content={content}
                                        users={users}
                                        availableShoots={availableShoots}
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 border-neutral-700 bg-neutral-900 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                                            >
                                                <Edit2 className="mr-1 size-3" />
                                                Attach Media / Poster
                                            </Button>
                                        }
                                    />
                                }
                            />
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
                            <div>
                                <h2 className="font-semibold">
                                    Footage Bank & Media Pipeline
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Drive folders for raw footage, B-roll
                                    archive, and final review assets
                                </p>
                            </div>
                            <EditContentDetailsDialog
                                content={content}
                                users={users}
                                availableShoots={availableShoots}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                    >
                                        Edit Links
                                    </Button>
                                }
                            />
                        </div>
                        <div className="mt-3.5 flex flex-col gap-2.5">
                            {content.primary_shoot ? (
                                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 p-3">
                                    <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-primary">
                                                🎬 Primary Shoot:
                                            </span>
                                            <span className="truncate text-xs font-medium">
                                                {content.primary_shoot.title}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            {dateTime(
                                                content.primary_shoot.starts_at,
                                            )}
                                            {content.primary_shoot.location &&
                                                ` • ${content.primary_shoot.location}`}
                                        </p>
                                        {content.primary_shoot.broll_tags &&
                                            content.primary_shoot.broll_tags
                                                .length > 0 && (
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {content.primary_shoot.broll_tags
                                                        .slice(0, 5)
                                                        .map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                </div>
                                            )}
                                    </div>
                                    {content.primary_shoot.drive_folder_url ? (
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="default"
                                            className="h-8 shrink-0 text-xs"
                                        >
                                            <a
                                                href={
                                                    content.primary_shoot
                                                        .drive_folder_url
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open Shoot Folder
                                                <ExternalLink data-icon="inline-end" />
                                            </a>
                                        </Button>
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground italic">
                                            No drive link
                                        </span>
                                    )}
                                </div>
                            ) : content.drive_folder_url ? (
                                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 p-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-semibold text-primary">
                                            🎬 Dedicated Shoot Directory (Google
                                            Drive)
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {content.drive_folder_url}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="default"
                                        className="h-8 shrink-0 text-xs"
                                    >
                                        <a
                                            href={content.drive_folder_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open Shots
                                            <ExternalLink data-icon="inline-end" />
                                        </a>
                                    </Button>
                                </div>
                            ) : null}

                            {referencedShoots.length > 0 && (
                                <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
                                    <p className="text-xs font-semibold text-foreground">
                                        🗂️ Referenced B-Roll Archive Shoots
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {referencedShoots.map((shoot) => (
                                            <div
                                                key={shoot.id}
                                                className="flex items-center justify-between gap-2 rounded border bg-background/80 p-2 text-xs"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="truncate font-medium text-foreground">
                                                        {shoot.title}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {dateTime(
                                                            shoot.starts_at,
                                                        )}
                                                    </p>
                                                    {shoot.broll_tags &&
                                                        shoot.broll_tags
                                                            .length > 0 && (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {shoot.broll_tags
                                                                    .slice(0, 4)
                                                                    .map(
                                                                        (
                                                                            tag,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    tag
                                                                                }
                                                                                className="py-0.2 rounded bg-muted px-1.5 text-[10px] text-muted-foreground"
                                                                            >
                                                                                #
                                                                                {
                                                                                    tag
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}
                                                </div>
                                                {shoot.drive_folder_url && (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 shrink-0 text-xs"
                                                    >
                                                        <a
                                                            href={
                                                                shoot.drive_folder_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Open B-Roll
                                                            <ExternalLink data-icon="inline-end" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {content.raw_footage_url && (
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-semibold">
                                            Raw Footage Link
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {content.raw_footage_url}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 shrink-0"
                                    >
                                        <a
                                            href={content.raw_footage_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open
                                            <ExternalLink data-icon="inline-end" />
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {content.final_asset_url && (
                                <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                            Final Export Asset (Client Review
                                            Delivery)
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {content.final_asset_url}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="h-8 shrink-0"
                                    >
                                        <a
                                            href={content.final_asset_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View Asset
                                            <ExternalLink data-icon="inline-end" />
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {content.business.drive_folder_url && (
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-medium">
                                            Client Workspace Drive
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {content.business.name} Root Folder
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 shrink-0"
                                    >
                                        <a
                                            href={
                                                content.business
                                                    .drive_folder_url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open
                                            <ExternalLink data-icon="inline-end" />
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {!content.primary_shoot &&
                                !content.drive_folder_url &&
                                !content.final_asset_url &&
                                !content.raw_footage_url &&
                                referencedShoots.length === 0 && (
                                    <div className="rounded-md border border-dashed p-4 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            No shoot directory or B-roll
                                            connected yet. Link an existing
                                            shoot or let your AI agent
                                            auto-provision the folders.
                                        </p>
                                    </div>
                                )}
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
