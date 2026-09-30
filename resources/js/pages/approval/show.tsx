import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import type { FormEvent } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ContentMediaPreview } from '@/components/content-media-preview';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dateTime } from '@/lib/format';

type Approval = {
    token: string;
    status: string;
    version: number;
    expires_at: string;
    content_item: {
        title: string;
        type?: string;
        brief?: string;
        hook?: string;
        script?: string;
        cta?: string;
        thumbnail_url?: string | null;
        final_asset_url?: string | null;
        drive_folder_url?: string | null;
        raw_footage_url?: string | null;
        business: { name: string };
    };
};

export default function ApprovalShow({ approval }: { approval: Approval }) {
    const form = useForm({ client_name: '', action: 'approved', comment: '' });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(`/approve/${approval.token}`, { preserveScroll: true });
    }

    return (
        <>
            <Head title={`Review ${approval.content_item.title}`} />
            <div className="min-h-screen bg-[#f7f8fc]">
                <header className="border-b bg-primary px-5 py-4 text-primary-foreground">
                    <div className="mx-auto flex max-w-5xl items-center gap-3">
                        <AppLogoIcon className="size-9 text-[#f4c34e]" />
                        <div>
                            <p className="font-semibold">Lumink Co.</p>
                            <p className="text-xs text-primary-foreground/65">
                                Content approval
                            </p>
                        </div>
                    </div>
                </header>
                <main className="mx-auto grid max-w-5xl gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="lumink-panel overflow-hidden bg-white">
                        <div className="border-b p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="lumink-label">
                                        {approval.content_item.business.name}
                                    </p>
                                    <h1 className="mt-1 text-2xl font-semibold">
                                        {approval.content_item.title}
                                    </h1>
                                </div>
                                <StatusBadge value={approval.status} />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Version {approval.version} · Link expires{' '}
                                {dateTime(approval.expires_at)}
                            </p>
                        </div>
                        <div className="p-5">
                            <div className="mx-auto max-w-sm">
                                <ContentMediaPreview
                                    title={approval.content_item.title}
                                    type={approval.content_item.type}
                                    thumbnailUrl={approval.content_item.thumbnail_url}
                                    finalAssetUrl={approval.content_item.final_asset_url}
                                    driveFolderUrl={approval.content_item.drive_folder_url}
                                    rawFootageUrl={approval.content_item.raw_footage_url}
                                    hook={approval.content_item.hook}
                                    className="rounded-lg shadow-sm"
                                />
                            </div>
                            <div className="mt-5 flex flex-col gap-4">
                                {approval.content_item.hook && (
                                    <div>
                                        <p className="lumink-label">Hook</p>
                                        <p className="mt-1 text-sm font-medium">
                                            {approval.content_item.hook}
                                        </p>
                                    </div>
                                )}
                                {approval.content_item.brief && (
                                    <div>
                                        <p className="lumink-label">Brief</p>
                                        <p className="mt-1 text-sm">
                                            {approval.content_item.brief}
                                        </p>
                                    </div>
                                )}
                                {approval.content_item.script && (
                                    <div>
                                        <p className="lumink-label">Script / Caption</p>
                                        <p className="mt-1 whitespace-pre-line text-sm">
                                            {approval.content_item.script}
                                        </p>
                                    </div>
                                )}
                                {approval.content_item.cta && (
                                    <div>
                                        <p className="lumink-label">
                                            Call to action
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {approval.content_item.cta}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                    <section className="lumink-panel h-fit bg-white p-5">
                        {approval.status === 'pending' ? (
                            <>
                                <h2 className="text-lg font-semibold">
                                    Your decision
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Enter your name so Lumink can record who
                                    reviewed this version.
                                </p>
                                <form
                                    onSubmit={submit}
                                    className="mt-5 flex flex-col gap-5"
                                >
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="client-name">
                                            Your name
                                        </Label>
                                        <Input
                                            id="client-name"
                                            required
                                            value={form.data.client_name}
                                            onChange={(event) =>
                                                form.setData(
                                                    'client_name',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            type="button"
                                            variant={
                                                form.data.action === 'approved'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                form.setData(
                                                    'action',
                                                    'approved',
                                                )
                                            }
                                        >
                                            <CheckCircle2 data-icon="inline-start" />
                                            Approve
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                form.data.action ===
                                                'changes_requested'
                                                    ? 'destructive'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                form.setData(
                                                    'action',
                                                    'changes_requested',
                                                )
                                            }
                                        >
                                            <MessageSquareText data-icon="inline-start" />
                                            Request changes
                                        </Button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="client-comment">
                                            Comment
                                        </Label>
                                        <textarea
                                            id="client-comment"
                                            className="min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                            value={form.data.comment}
                                            onChange={(event) =>
                                                form.setData(
                                                    'comment',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="What should Lumink know?"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={form.processing}
                                    >
                                        Submit response
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <CheckCircle2 className="size-10 text-primary" />
                                <h2 className="text-lg font-semibold">
                                    Response recorded
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    This approval request has already been
                                    completed.
                                </p>
                                <StatusBadge value={approval.status} />
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}
