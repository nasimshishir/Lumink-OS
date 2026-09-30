import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BriefcaseBusiness,
    CircleDollarSign,
    ClipboardCheck,
    RotateCcw,
    Trash2,
    Video,
} from 'lucide-react';
import { useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { dateTime, money, shortDate } from '@/lib/format';

type TrashedBusiness = {
    id: number;
    name: string;
    slug: string;
    status: string;
    industry: string;
    monthly_retainer: string;
    agreement_start?: string;
    deleted_at: string;
    content_items_count: number;
    tasks_count: number;
};

type TrashedTask = {
    id: number;
    title: string;
    type: string;
    status: string;
    priority: string;
    due_at?: string;
    actual_minutes: number;
    deleted_at: string;
    business?: { id: number; name: string };
    owner?: { id: number; name: string };
};

type TrashedContentItem = {
    id: number;
    title: string;
    type: string;
    stage: string;
    priority: string;
    publish_at?: string;
    deleted_at: string;
    business?: { id: number; name: string };
    owner?: { id: number; name: string };
    campaign?: { id: number; name: string };
};

type TrashedInvoice = {
    id: number;
    number: string;
    total: string;
    issue_date: string;
    due_date: string;
    deleted_at: string;
    business?: { id: number; name: string };
};

type TrashedExpense = {
    id: number;
    description: string;
    category: string;
    allocation_type: string;
    vendor?: string;
    amount: string;
    spent_on: string;
    deleted_at: string;
    business?: { id: number; name: string };
};

type Props = {
    trashed: {
        businesses: TrashedBusiness[];
        tasks: TrashedTask[];
        content: TrashedContentItem[];
        invoices: TrashedInvoice[];
        expenses: TrashedExpense[];
    };
    counts: {
        businesses: number;
        tasks: number;
        content: number;
        finance: number;
        invoices: number;
        expenses: number;
        total: number;
    };
    canManage?: boolean;
    isOwner?: boolean;
};

type ItemToDelete = {
    type: string;
    id: number;
    label: string;
} | null;

export default function RecycleBin({
    trashed,
    counts,
    canManage = true,
    isOwner = true,
}: Props) {
    const searchParams =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : null;
    const initialTabParam = searchParams?.get('tab') as
        | 'businesses'
        | 'tasks'
        | 'content'
        | 'finance'
        | null;

    const [activeTab, setActiveTab] = useState<
        'businesses' | 'tasks' | 'content' | 'finance'
    >(
        initialTabParam &&
            ['businesses', 'tasks', 'content', 'finance'].includes(
                initialTabParam,
            )
            ? initialTabParam
            : 'businesses',
    );
    const [financeSubTab, setFinanceSubTab] = useState<
        'all' | 'invoices' | 'expenses'
    >('all');

    const [itemToForceDelete, setItemToForceDelete] =
        useState<ItemToDelete>(null);
    const [emptyTrashConfirm, setEmptyTrashConfirm] = useState<{
        open: boolean;
        type?: string;
        title: string;
    }>({
        open: false,
        title: '',
    });
    const [actionInProgress, setActionInProgress] = useState<string | null>(
        null,
    );

    function handleRestore(type: string, id: number) {
        const actionKey = `${type}-${id}`;
        setActionInProgress(actionKey);
        router.post(
            `/recycle-bin/${type}/${id}/restore`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setActionInProgress(null),
            },
        );
    }

    function confirmForceDelete() {
        if (!itemToForceDelete) {
            return;
        }

        const actionKey = `${itemToForceDelete.type}-${itemToForceDelete.id}`;
        setActionInProgress(actionKey);
        router.delete(
            `/recycle-bin/${itemToForceDelete.type}/${itemToForceDelete.id}/force-delete`,
            {
                preserveScroll: true,
                onSuccess: () => setItemToForceDelete(null),
                onFinish: () => setActionInProgress(null),
            },
        );
    }

    function handleRestoreAll(type: string) {
        setActionInProgress(`restore-all-${type}`);
        router.post(
            `/recycle-bin/${type}/restore-all`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setActionInProgress(null),
            },
        );
    }

    function confirmEmptyTrash() {
        const type = emptyTrashConfirm.type || 'all';
        setActionInProgress('empty-trash');
        router.delete(`/recycle-bin/empty?type=${type}`, {
            preserveScroll: true,
            onSuccess: () => setEmptyTrashConfirm({ open: false, title: '' }),
            onFinish: () => setActionInProgress(null),
        });
    }

    const currentTabCount = counts[activeTab] ?? 0;

    return (
        <>
            <Head title="Recycle Bin" />
            <PageHeading
                title="Recycle Bin"
                description="Recover deleted items or permanently purge them across your entire admin panel."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {currentTabCount > 0 && canManage && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={actionInProgress !== null}
                                onClick={() => handleRestoreAll(activeTab)}
                            >
                                <RotateCcw className="mr-1.5 size-4" />
                                Restore All in{' '}
                                {activeTab.charAt(0).toUpperCase() +
                                    activeTab.slice(1)}
                            </Button>
                        )}
                        {currentTabCount > 0 && isOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={actionInProgress !== null}
                                onClick={() =>
                                    setEmptyTrashConfirm({
                                        open: true,
                                        type: activeTab,
                                        title: `Empty ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Trash`,
                                    })
                                }
                            >
                                <Trash2 className="mr-1.5 size-4" />
                                Empty Tab
                            </Button>
                        )}
                        {counts.total > 0 && isOwner && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={actionInProgress !== null}
                                onClick={() =>
                                    setEmptyTrashConfirm({
                                        open: true,
                                        type: 'all',
                                        title: 'Empty Entire Recycle Bin',
                                    })
                                }
                            >
                                <Trash2 className="mr-1.5 size-4" />
                                Purge All ({counts.total})
                            </Button>
                        )}
                    </div>
                }
            />

            <main className="flex flex-col gap-6 p-5">
                {/* Main Category Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('businesses')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                                activeTab === 'businesses'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <BriefcaseBusiness className="size-4" />
                            Businesses
                            <Badge
                                variant={
                                    activeTab === 'businesses'
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className="ml-1 px-1.5 py-0 text-xs"
                            >
                                {counts.businesses}
                            </Badge>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('tasks')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                                activeTab === 'tasks'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <ClipboardCheck className="size-4" />
                            Tasks
                            <Badge
                                variant={
                                    activeTab === 'tasks'
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className="ml-1 px-1.5 py-0 text-xs"
                            >
                                {counts.tasks}
                            </Badge>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('content')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                                activeTab === 'content'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <Video className="size-4" />
                            Content
                            <Badge
                                variant={
                                    activeTab === 'content'
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className="ml-1 px-1.5 py-0 text-xs"
                            >
                                {counts.content}
                            </Badge>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('finance')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                                activeTab === 'finance'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <CircleDollarSign className="size-4" />
                            Finance
                            <Badge
                                variant={
                                    activeTab === 'finance'
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className="ml-1 px-1.5 py-0 text-xs"
                            >
                                {counts.finance}
                            </Badge>
                        </button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Total items in bin:{' '}
                        <span className="font-semibold text-foreground">
                            {counts.total}
                        </span>
                    </div>
                </div>

                {/* Sub-filter for Finance Tab */}
                {activeTab === 'finance' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                            Filter:
                        </span>
                        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setFinanceSubTab('all')}
                                className={`rounded px-2.5 py-1 transition-colors ${
                                    financeSubTab === 'all'
                                        ? 'bg-background font-medium text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                All ({counts.finance})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFinanceSubTab('invoices')}
                                className={`rounded px-2.5 py-1 transition-colors ${
                                    financeSubTab === 'invoices'
                                        ? 'bg-background font-medium text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Invoices ({counts.invoices})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFinanceSubTab('expenses')}
                                className={`rounded px-2.5 py-1 transition-colors ${
                                    financeSubTab === 'expenses'
                                        ? 'bg-background font-medium text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Expenses ({counts.expenses})
                            </button>
                        </div>
                    </div>
                )}

                {/* Businesses Tab */}
                {activeTab === 'businesses' && (
                    <>
                        {trashed.businesses.length === 0 ? (
                            <EmptyTrashState
                                icon={BriefcaseBusiness}
                                title="No businesses in the Recycle Bin"
                                description="Businesses moved to trash will be held here safely before permanent removal."
                            />
                        ) : (
                            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                                <div className="grid grid-cols-12 items-center gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <div className="col-span-12 sm:col-span-4">
                                        Business
                                    </div>
                                    <div className="hidden sm:col-span-2 sm:block">
                                        Retainer
                                    </div>
                                    <div className="hidden md:col-span-2 md:block">
                                        Linked Items
                                    </div>
                                    <div className="hidden sm:col-span-2 sm:block">
                                        Deleted On
                                    </div>
                                    <div className="col-span-12 text-right sm:col-span-2">
                                        Actions
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {trashed.businesses.map((business) => (
                                        <div
                                            key={business.id}
                                            className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/15"
                                        >
                                            <div className="col-span-12 sm:col-span-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-sm font-semibold text-foreground">
                                                        {business.name
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-foreground">
                                                            {business.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {business.industry}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hidden text-sm font-medium sm:col-span-2 sm:block">
                                                {money(
                                                    business.monthly_retainer,
                                                )}
                                                <span className="block text-xs font-normal text-muted-foreground">
                                                    /month
                                                </span>
                                            </div>
                                            <div className="hidden text-xs text-muted-foreground md:col-span-2 md:block">
                                                <span>
                                                    {
                                                        business.content_items_count
                                                    }{' '}
                                                    content
                                                </span>
                                                <span className="mx-1">•</span>
                                                <span>
                                                    {business.tasks_count} tasks
                                                </span>
                                            </div>
                                            <div className="hidden text-xs text-muted-foreground sm:col-span-2 sm:block">
                                                {dateTime(business.deleted_at)}
                                            </div>
                                            <div className="col-span-12 flex items-center justify-end gap-1.5 sm:col-span-2">
                                                {canManage && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        disabled={
                                                            actionInProgress ===
                                                            `business-${business.id}`
                                                        }
                                                        onClick={() =>
                                                            handleRestore(
                                                                'business',
                                                                business.id,
                                                            )
                                                        }
                                                    >
                                                        <RotateCcw className="size-3.5" />
                                                        Restore
                                                    </Button>
                                                )}
                                                {isOwner && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={
                                                            actionInProgress ===
                                                            `business-${business.id}`
                                                        }
                                                        onClick={() =>
                                                            setItemToForceDelete(
                                                                {
                                                                    type: 'business',
                                                                    id: business.id,
                                                                    label: business.name,
                                                                },
                                                            )
                                                        }
                                                        title="Delete permanently"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                    <>
                        {trashed.tasks.length === 0 ? (
                            <EmptyTrashState
                                icon={ClipboardCheck}
                                title="No tasks in the Recycle Bin"
                                description="Deleted tasks will be listed here and can be restored at any point."
                            />
                        ) : (
                            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                                <div className="grid grid-cols-12 items-center gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <div className="col-span-12 sm:col-span-5">
                                        Task
                                    </div>
                                    <div className="hidden sm:col-span-3 sm:block">
                                        Business / Assignee
                                    </div>
                                    <div className="hidden md:col-span-2 md:block">
                                        Deleted On
                                    </div>
                                    <div className="col-span-12 text-right sm:col-span-2">
                                        Actions
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {trashed.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/15"
                                        >
                                            <div className="col-span-12 sm:col-span-5">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            task.priority ===
                                                            'high'
                                                                ? 'destructive'
                                                                : task.priority ===
                                                                    'medium'
                                                                  ? 'default'
                                                                  : 'secondary'
                                                        }
                                                        className="shrink-0 text-[10px] uppercase"
                                                    >
                                                        {task.priority}
                                                    </Badge>
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {task.title}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="hidden text-xs text-muted-foreground sm:col-span-3 sm:block">
                                                <p className="truncate font-medium text-foreground">
                                                    {task.business?.name ??
                                                        'General / Internal'}
                                                </p>
                                                <p>
                                                    {task.owner?.name
                                                        ? `Assigned: ${task.owner.name}`
                                                        : 'Unassigned'}
                                                </p>
                                            </div>
                                            <div className="hidden text-xs text-muted-foreground md:col-span-2 md:block">
                                                {dateTime(task.deleted_at)}
                                            </div>
                                            <div className="col-span-12 flex items-center justify-end gap-1.5 sm:col-span-2">
                                                {canManage && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        disabled={
                                                            actionInProgress ===
                                                            `task-${task.id}`
                                                        }
                                                        onClick={() =>
                                                            handleRestore(
                                                                'task',
                                                                task.id,
                                                            )
                                                        }
                                                    >
                                                        <RotateCcw className="size-3.5" />
                                                        Restore
                                                    </Button>
                                                )}
                                                {isOwner && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={
                                                            actionInProgress ===
                                                            `task-${task.id}`
                                                        }
                                                        onClick={() =>
                                                            setItemToForceDelete(
                                                                {
                                                                    type: 'task',
                                                                    id: task.id,
                                                                    label: task.title,
                                                                },
                                                            )
                                                        }
                                                        title="Delete permanently"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Content Tab */}
                {activeTab === 'content' && (
                    <>
                        {trashed.content.length === 0 ? (
                            <EmptyTrashState
                                icon={Video}
                                title="No content deliverables in the Recycle Bin"
                                description="Drafts, scripts, and video items moved to trash will appear here."
                            />
                        ) : (
                            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                                <div className="grid grid-cols-12 items-center gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <div className="col-span-12 sm:col-span-5">
                                        Content Item
                                    </div>
                                    <div className="hidden sm:col-span-3 sm:block">
                                        Business / Campaign
                                    </div>
                                    <div className="hidden md:col-span-2 md:block">
                                        Deleted On
                                    </div>
                                    <div className="col-span-12 text-right sm:col-span-2">
                                        Actions
                                    </div>
                                </div>
                                <div className="divide-y">
                                    {trashed.content.map((item) => (
                                        <div
                                            key={item.id}
                                            className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/15"
                                        >
                                            <div className="col-span-12 sm:col-span-5">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="shrink-0 text-[10px] uppercase"
                                                    >
                                                        {item.type}
                                                    </Badge>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground capitalize">
                                                            Stage:{' '}
                                                            {item.stage.replaceAll(
                                                                '_',
                                                                ' ',
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hidden text-xs text-muted-foreground sm:col-span-3 sm:block">
                                                <p className="truncate font-medium text-foreground">
                                                    {item.business?.name ?? '—'}
                                                </p>
                                                <p>
                                                    {item.campaign?.name ??
                                                        'Standard Content'}
                                                </p>
                                            </div>
                                            <div className="hidden text-xs text-muted-foreground md:col-span-2 md:block">
                                                {dateTime(item.deleted_at)}
                                            </div>
                                            <div className="col-span-12 flex items-center justify-end gap-1.5 sm:col-span-2">
                                                {canManage && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        disabled={
                                                            actionInProgress ===
                                                            `content-${item.id}`
                                                        }
                                                        onClick={() =>
                                                            handleRestore(
                                                                'content',
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        <RotateCcw className="size-3.5" />
                                                        Restore
                                                    </Button>
                                                )}
                                                {isOwner && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={
                                                            actionInProgress ===
                                                            `content-${item.id}`
                                                        }
                                                        onClick={() =>
                                                            setItemToForceDelete(
                                                                {
                                                                    type: 'content',
                                                                    id: item.id,
                                                                    label: item.title,
                                                                },
                                                            )
                                                        }
                                                        title="Delete permanently"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Finance Tab */}
                {activeTab === 'finance' && (
                    <div className="flex flex-col gap-6">
                        {/* Invoices */}
                        {(financeSubTab === 'all' ||
                            financeSubTab === 'invoices') && (
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Deleted Invoices (
                                        {trashed.invoices.length})
                                    </h3>
                                </div>
                                {trashed.invoices.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                                        No deleted invoices in trash.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                                        <div className="grid grid-cols-12 items-center gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            <div className="col-span-12 sm:col-span-4">
                                                Invoice # / Business
                                            </div>
                                            <div className="hidden sm:col-span-2 sm:block">
                                                Amount
                                            </div>
                                            <div className="hidden md:col-span-2 md:block">
                                                Due Date
                                            </div>
                                            <div className="hidden sm:col-span-2 sm:block">
                                                Deleted On
                                            </div>
                                            <div className="col-span-12 text-right sm:col-span-2">
                                                Actions
                                            </div>
                                        </div>
                                        <div className="divide-y">
                                            {trashed.invoices.map((inv) => (
                                                <div
                                                    key={inv.id}
                                                    className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/15"
                                                >
                                                    <div className="col-span-12 sm:col-span-4">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {inv.number}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {inv.business
                                                                ?.name ?? '—'}
                                                        </p>
                                                    </div>
                                                    <div className="hidden text-sm font-medium sm:col-span-2 sm:block">
                                                        {money(inv.total)}
                                                    </div>
                                                    <div className="hidden text-xs text-muted-foreground md:col-span-2 md:block">
                                                        {shortDate(
                                                            inv.due_date,
                                                        )}
                                                    </div>
                                                    <div className="hidden text-xs text-muted-foreground sm:col-span-2 sm:block">
                                                        {dateTime(
                                                            inv.deleted_at,
                                                        )}
                                                    </div>
                                                    <div className="col-span-12 flex items-center justify-end gap-1.5 sm:col-span-2">
                                                        {canManage && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1 text-xs"
                                                                disabled={
                                                                    actionInProgress ===
                                                                    `invoice-${inv.id}`
                                                                }
                                                                onClick={() =>
                                                                    handleRestore(
                                                                        'invoice',
                                                                        inv.id,
                                                                    )
                                                                }
                                                            >
                                                                <RotateCcw className="size-3.5" />
                                                                Restore
                                                            </Button>
                                                        )}
                                                        {isOwner && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                disabled={
                                                                    actionInProgress ===
                                                                    `invoice-${inv.id}`
                                                                }
                                                                onClick={() =>
                                                                    setItemToForceDelete(
                                                                        {
                                                                            type: 'invoice',
                                                                            id: inv.id,
                                                                            label: `Invoice ${inv.number}`,
                                                                        },
                                                                    )
                                                                }
                                                                title="Delete permanently"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Expenses */}
                        {(financeSubTab === 'all' ||
                            financeSubTab === 'expenses') && (
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Deleted Expenses (
                                        {trashed.expenses.length})
                                    </h3>
                                </div>
                                {trashed.expenses.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                                        No deleted expenses in trash.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                                        <div className="grid grid-cols-12 items-center gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            <div className="col-span-12 sm:col-span-4">
                                                Expense / Category
                                            </div>
                                            <div className="hidden sm:col-span-2 sm:block">
                                                Amount
                                            </div>
                                            <div className="hidden md:col-span-2 md:block">
                                                Allocation / Vendor
                                            </div>
                                            <div className="hidden sm:col-span-2 sm:block">
                                                Deleted On
                                            </div>
                                            <div className="col-span-12 text-right sm:col-span-2">
                                                Actions
                                            </div>
                                        </div>
                                        <div className="divide-y">
                                            {trashed.expenses.map((expense) => (
                                                <div
                                                    key={expense.id}
                                                    className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/15"
                                                >
                                                    <div className="col-span-12 sm:col-span-4">
                                                        <p className="text-sm font-medium text-foreground">
                                                            {
                                                                expense.description
                                                            }
                                                        </p>
                                                        <p className="text-xs text-muted-foreground capitalize">
                                                            Category:{' '}
                                                            {expense.category}
                                                        </p>
                                                    </div>
                                                    <div className="hidden text-sm font-medium sm:col-span-2 sm:block">
                                                        {money(expense.amount)}
                                                    </div>
                                                    <div className="hidden text-xs text-muted-foreground md:col-span-2 md:block">
                                                        <span className="capitalize">
                                                            {
                                                                expense.allocation_type
                                                            }
                                                        </span>
                                                        {expense.vendor &&
                                                            ` • ${expense.vendor}`}
                                                    </div>
                                                    <div className="hidden text-xs text-muted-foreground sm:col-span-2 sm:block">
                                                        {dateTime(
                                                            expense.deleted_at,
                                                        )}
                                                    </div>
                                                    <div className="col-span-12 flex items-center justify-end gap-1.5 sm:col-span-2">
                                                        {canManage && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1 text-xs"
                                                                disabled={
                                                                    actionInProgress ===
                                                                    `expense-${expense.id}`
                                                                }
                                                                onClick={() =>
                                                                    handleRestore(
                                                                        'expense',
                                                                        expense.id,
                                                                    )
                                                                }
                                                            >
                                                                <RotateCcw className="size-3.5" />
                                                                Restore
                                                            </Button>
                                                        )}
                                                        {isOwner && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                disabled={
                                                                    actionInProgress ===
                                                                    `expense-${expense.id}`
                                                                }
                                                                onClick={() =>
                                                                    setItemToForceDelete(
                                                                        {
                                                                            type: 'expense',
                                                                            id: expense.id,
                                                                            label: expense.description,
                                                                        },
                                                                    )
                                                                }
                                                                title="Delete permanently"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Permanent Deletion Confirm Dialog */}
            <Dialog
                open={itemToForceDelete !== null}
                onOpenChange={(open) => !open && setItemToForceDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                            <AlertTriangle className="size-5" />
                        </div>
                        <DialogTitle>
                            Permanently delete {itemToForceDelete?.label}?
                        </DialogTitle>
                        <DialogDescription>
                            This action is permanent and cannot be undone. All
                            database records and associations will be
                            permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setItemToForceDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmForceDelete}
                            disabled={actionInProgress !== null}
                        >
                            <Trash2 className="mr-1.5 size-4" />
                            Delete Forever
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Empty Trash Confirm Dialog */}
            <Dialog
                open={emptyTrashConfirm.open}
                onOpenChange={(open) =>
                    !open && setEmptyTrashConfirm({ open: false, title: '' })
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                            <AlertTriangle className="size-5" />
                        </div>
                        <DialogTitle>{emptyTrashConfirm.title}?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently erase all
                            trashed items in this section? This cannot be
                            recovered.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setEmptyTrashConfirm({ open: false, title: '' })
                            }
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmEmptyTrash}
                            disabled={actionInProgress !== null}
                        >
                            <Trash2 className="mr-1.5 size-4" />
                            Confirm Empty Trash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function EmptyTrashState({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                <Icon className="size-7 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {description}
            </p>
        </div>
    );
}
