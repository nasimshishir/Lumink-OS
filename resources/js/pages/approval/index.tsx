import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    FileText,
    History,
    MessageSquareQuote,
    MessageSquareText,
    Send,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { ContentMediaPreview } from '@/components/content-media-preview';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { dateTime, shortDate } from '@/lib/format';

type ApprovalResponse = {
    id: number;
    client_name: string;
    action: string;
    comment?: string | null;
    created_at: string;
};

type ApprovalRequest = {
    id: number;
    token: string;
    status: string;
    version: number;
    expires_at: string;
    responses?: ApprovalResponse[];
};

type ContentApprovalItem = {
    id: number;
    title: string;
    type: string;
    stage: string;
    priority: string;
    brief?: string | null;
    hook?: string | null;
    script?: string | null;
    cta?: string | null;
    thumbnail_url?: string | null;
    final_asset_url?: string | null;
    drive_folder_url?: string | null;
    raw_footage_url?: string | null;
    publish_at?: string | null;
    revision_number: number;
    created_at: string;
    updated_at: string;
    business?: {
        id: number;
        name: string;
        logo_url?: string | null;
        industry?: string | null;
    } | null;
    owner?: {
        id: number;
        name: string;
        avatar?: string | null;
    } | null;
    approvals?: ApprovalRequest[];
};

type BusinessInfo = {
    id: number;
    name: string;
    logo_url?: string | null;
    industry?: string | null;
};

function PendingItemCard({
    item,
    isClient,
}: {
    item: ContentApprovalItem;
    isClient: boolean;
}) {
    const [action, setAction] = useState<'approved' | 'changes_requested'>(
        'approved',
    );
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);

    const activeApproval = item.approvals?.[0];
    const pastResponses =
        item.approvals?.flatMap((a) => a.responses ?? []) ?? [];

    function handleDecision() {
        if (action === 'changes_requested' && !comment.trim()) {
            alert(
                'Please provide notes or comments explaining what changes are needed.',
            );

            return;
        }

        setIsSubmitting(true);
        router.post(
            `/content/${item.id}/approve`,
            { action, comment },
            {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
            },
        );
    }

    function copyReviewUrl() {
        if (!activeApproval?.token) {
            return;
        }

        const url = `${window.location.origin}/approve/${activeApproval.token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2500);
    }

    return (
        <article className="lumink-panel overflow-hidden border border-border/80 bg-card shadow-sm transition hover:shadow-md">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-lg font-semibold text-foreground">
                        {item.title}
                    </span>
                    <Badge variant="outline" className="font-medium capitalize">
                        {item.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        Revision v{item.revision_number}
                    </Badge>
                    {item.business && !isClient && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {item.business.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {activeApproval?.token && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyReviewUrl}
                            className="h-8 gap-1.5 text-xs"
                            title="Copy external review link"
                        >
                            <Copy className="size-3.5" />
                            {copiedToken ? 'Link copied' : 'Review link'}
                        </Button>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="size-3" />
                        Awaiting your decision
                    </span>
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
                {/* Left column: Media Preview & Copy */}
                <div className="flex flex-col gap-5">
                    <div className="mx-auto w-full max-w-md">
                        <ContentMediaPreview
                            title={item.title}
                            type={item.type}
                            stage={item.stage}
                            thumbnailUrl={item.thumbnail_url}
                            finalAssetUrl={item.final_asset_url}
                            driveFolderUrl={item.drive_folder_url}
                            rawFootageUrl={item.raw_footage_url}
                            hook={item.hook}
                            caption={item.script}
                            className="rounded-xl shadow-sm ring-1 ring-border"
                        />
                    </div>

                    <div className="flex flex-col gap-4 rounded-lg bg-muted/20 p-4 text-sm">
                        {item.hook && (
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Hook / Opening
                                </p>
                                <p className="mt-1 font-medium text-foreground">
                                    "{item.hook}"
                                </p>
                            </div>
                        )}

                        {item.brief && (
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Creative Brief
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    {item.brief}
                                </p>
                            </div>
                        )}

                        {item.script && (
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Script / Caption Copy
                                </p>
                                <p className="mt-1 whitespace-pre-line text-foreground">
                                    {item.script}
                                </p>
                            </div>
                        )}

                        {item.cta && (
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Call To Action (CTA)
                                </p>
                                <p className="mt-1 font-medium text-primary">
                                    {item.cta}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: Details & Approval Decision Form */}
                <div className="flex flex-col justify-between gap-5 rounded-xl border bg-muted/10 p-5">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b pb-3 text-xs text-muted-foreground">
                            <span>Creator</span>
                            <div className="flex items-center gap-2">
                                {item.owner && (
                                    <>
                                        <Avatar className="size-5">
                                            <AvatarImage
                                                src={
                                                    item.owner.avatar ??
                                                    undefined
                                                }
                                            />
                                            <AvatarFallback className="text-[10px]">
                                                {item.owner.name.slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-foreground">
                                            {item.owner.name}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {item.publish_at && (
                            <div className="flex items-center justify-between border-b pb-3 text-xs text-muted-foreground">
                                <span>Planned publish date</span>
                                <span className="font-medium text-foreground">
                                    {dateTime(item.publish_at)}
                                </span>
                            </div>
                        )}

                        {pastResponses.length > 0 && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                                <p className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                                    <History className="size-3.5" />
                                    Previous Feedback History
                                </p>
                                <div className="mt-2 flex flex-col gap-2">
                                    {pastResponses.slice(-2).map((resp) => (
                                        <div
                                            key={resp.id}
                                            className="text-muted-foreground"
                                        >
                                            <span className="font-medium text-foreground capitalize">
                                                {resp.action.replace('_', ' ')}
                                            </span>{' '}
                                            by {resp.client_name} (
                                            {shortDate(resp.created_at)}):
                                            {resp.comment && (
                                                <p className="mt-0.5 text-foreground italic">
                                                    "{resp.comment}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Decision selector */}
                        <div className="mt-2 flex flex-col gap-3">
                            <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Your Decision
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant={
                                        action === 'approved'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setAction('approved')}
                                    className={`h-11 justify-center gap-2 font-semibold transition ${
                                        action === 'approved'
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : 'hover:border-emerald-500/50 hover:text-emerald-600'
                                    }`}
                                >
                                    <CheckCircle2 className="size-4" />
                                    Approve deliverable
                                </Button>

                                <Button
                                    type="button"
                                    variant={
                                        action === 'changes_requested'
                                            ? 'destructive'
                                            : 'outline'
                                    }
                                    onClick={() =>
                                        setAction('changes_requested')
                                    }
                                    className={`h-11 justify-center gap-2 font-semibold transition ${
                                        action === 'changes_requested'
                                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                                            : 'hover:border-amber-500/50 hover:text-amber-600'
                                    }`}
                                >
                                    <MessageSquareText className="size-4" />
                                    Request changes
                                </Button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor={`comment-${item.id}`}
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    {action === 'changes_requested' ? (
                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                            What changes should our team make? *
                                        </span>
                                    ) : (
                                        'Optional comment or note to the team'
                                    )}
                                </label>
                                <Textarea
                                    id={`comment-${item.id}`}
                                    rows={3}
                                    placeholder={
                                        action === 'changes_requested'
                                            ? 'e.g. Please update the hook text to focus more on the weekend discount...'
                                            : 'e.g. Looks great, ready to schedule and post!'
                                    }
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="resize-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="button"
                            onClick={handleDecision}
                            disabled={isSubmitting}
                            className={`w-full font-semibold shadow-sm ${
                                action === 'approved'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-amber-600 text-white hover:bg-amber-700'
                            }`}
                        >
                            {isSubmitting ? (
                                'Recording response...'
                            ) : action === 'approved' ? (
                                <>
                                    <CheckCircle2 className="mr-1.5 size-4" />
                                    Confirm deliverable approval
                                </>
                            ) : (
                                <>
                                    <Send className="mr-1.5 size-4" />
                                    Send revision notes to team
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
}

export default function ApprovalIndex({
    pendingItems = [],
    approvedItems = [],
    business,
    isClient = false,
}: {
    pendingItems: ContentApprovalItem[];
    approvedItems: ContentApprovalItem[];
    business?: BusinessInfo | null;
    isClient: boolean;
}) {
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>(
        'pending',
    );

    return (
        <>
            <Head
                title={isClient ? 'Deliverable Approvals' : 'Client Approvals'}
            />

            <PageHeading
                title={
                    isClient ? 'Deliverables & Approvals' : 'Client Approvals'
                }
                description={
                    isClient && business
                        ? `Review, approve, or request edits for creative assets created for ${business.name}.`
                        : 'Manage deliverables submitted for client approval and review past approvals.'
                }
                actions={
                    business && (
                        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
                            <Sparkles className="size-4 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">
                                    {business.name}
                                </span>
                                {business.industry && (
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                        {business.industry}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                }
            />

            <main className="flex flex-col gap-6 p-5">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pending')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'pending'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                    >
                        <span>Awaiting Approval</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'pending'
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {pendingItems.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('approved')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'approved'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                    >
                        <span>Approved Deliverables</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                activeTab === 'approved'
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {approvedItems.length}
                        </span>
                    </button>
                </div>

                {/* Tab 1: Pending Items */}
                {activeTab === 'pending' && (
                    <section className="flex flex-col gap-6">
                        {pendingItems.length > 0 ? (
                            pendingItems.map((item) => (
                                <PendingItemCard
                                    key={item.id}
                                    item={item}
                                    isClient={isClient}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                    <CheckCircle2 className="size-8" />
                                </div>
                                <h2 className="mt-4 text-lg font-semibold text-foreground">
                                    All deliverables approved!
                                </h2>
                                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                    There are currently no deliverables awaiting
                                    your review. Once our creative team uploads
                                    new assets for review, they will appear
                                    right here.
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {/* Tab 2: Approved Archive */}
                {activeTab === 'approved' && (
                    <section className="lumink-panel overflow-hidden">
                        <div className="border-b px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                Approved deliverables history
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Previously reviewed and approved creative
                                assets.
                            </p>
                        </div>

                        {approvedItems.length > 0 ? (
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Deliverable</th>
                                        {!isClient && <th>Business</th>}
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Revision</th>
                                        <th>Last Updated</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedItems.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {item.thumbnail_url ? (
                                                        <img
                                                            src={
                                                                item.thumbnail_url
                                                            }
                                                            alt={item.title}
                                                            className="size-10 rounded-md object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                            <FileText className="size-5" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {item.title}
                                                        </p>
                                                        {item.hook && (
                                                            <p className="line-clamp-1 text-xs text-muted-foreground">
                                                                "{item.hook}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {!isClient && (
                                                <td>
                                                    <span className="text-sm font-medium">
                                                        {item.business?.name ??
                                                            '—'}
                                                    </span>
                                                </td>
                                            )}

                                            <td>
                                                <Badge
                                                    variant="outline"
                                                    className="capitalize"
                                                >
                                                    {item.type}
                                                </Badge>
                                            </td>

                                            <td>
                                                <StatusBadge
                                                    value={item.stage}
                                                />
                                            </td>

                                            <td>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    v{item.revision_number}
                                                </span>
                                            </td>

                                            <td>{dateTime(item.updated_at)}</td>

                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/content/${item.id}`}
                                                        >
                                                            <span>View</span>
                                                            <ExternalLink className="ml-1 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-10 text-center">
                                <MessageSquareQuote className="size-10 text-muted-foreground/40" />
                                <p className="mt-3 text-sm font-medium">
                                    No approved deliverables yet
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Approved deliverables will be archived here
                                    for reference.
                                </p>
                            </div>
                        )}
                    </section>
                )}
            </main>
        </>
    );
}
