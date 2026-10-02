import { Head, router, useForm } from '@inertiajs/react';
import {
    Bot,
    Check,
    CheckCircle2,
    Copy,
    ExternalLink,
    FileJson,
    FolderPlus,
    Key,
    Plus,
    Shield,
    Trash2,
    Unplug,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dateTime } from '@/lib/format';

type DriveConnection = {
    id: number;
    google_email: string;
    expires_at?: string;
};

type Business = {
    id: number;
    name: string;
    drive_folder_url?: string;
};

type ApiToken = {
    id: number;
    name: string;
    abilities: string[];
    last_used_at?: string | null;
    created_at?: string | null;
    expires_at?: string | null;
};

type NewApiToken = {
    name: string;
    token: string;
    expires_at?: string | null;
};

export default function Integrations({
    driveConnection,
    businesses = [],
    apiTokens = [],
    newApiToken,
}: {
    driveConnection?: DriveConnection;
    businesses?: Business[];
    apiTokens?: ApiToken[];
    newApiToken?: NewApiToken | null;
}) {
    const [createTokenOpen, setCreateTokenOpen] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const tokenForm = useForm({
        name: '',
        expires_in_days: '90',
    });

    function submitToken(e: FormEvent) {
        e.preventDefault();
        tokenForm.post('/settings/api-tokens', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateTokenOpen(false);
                tokenForm.reset();
            },
        });
    }

    function revokeToken(id: number) {
        if (
            confirm(
                'Are you sure you want to revoke this API token? Any AI agent using this token will immediately lose access.',
            )
        ) {
            router.delete(`/settings/api-tokens/${id}`, {
                preserveScroll: true,
            });
        }
    }

    function copyToClipboard(text: string, isPrompt = false) {
        navigator.clipboard.writeText(text);

        if (isPrompt) {
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 2000);
        } else {
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        }
    }

    const agentPromptTemplate = `You are an AI Agent with direct authenticated access to Lumink OS (Agency OS) — v1.1.0.
API Base URL: ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1
Authentication: Send header 'Authorization: Bearer <YOUR_API_TOKEN>' or 'X-Api-Token: <YOUR_API_TOKEN>' on every request.
Token self-test: GET ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/agent/token-test

Available Workflows:
1. Discover client retainers, deliverable targets & Drive folders: GET /businesses
   - Each business includes deliverable_targets (per-business, not default) and drive_folders_map.
2. Update monthly delivery targets for a business: PATCH /businesses/{id}/targets
   - Body: { "deliverable_targets": { "reels": N, "static": N, "carousel": N, "stories": N, "cinematic": N } }
   - Owner/manager only. Always read current targets before planning — do not assume defaults.
3. Plan content & define tasks: POST /content (accepts 'tasks' array to set up tasks simultaneously)
   - Can include inspirations array of { url, notes } objects.
4. Connect Google Drive shot directory: PATCH /content/{id} with { "drive_folder_url": "...", "stage": "shot" }
5. Track task completion: PATCH /tasks/{id} with { "status": "in_progress" | "done", "actual_minutes": 120 }
6. Submit completed deliverable: PATCH /content/{id} with { "final_asset_url": "...", "stage": "client_review" }

IMPORTANT — Stage Proofs: Content stage transitions now require a human to submit proof (URL/image/notes) via the UI. You can PATCH the stage to signal intent, but the stage won't complete until proof is submitted by the team.

Live capabilities manifest (always up to date): ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/agent/capabilities
Full operating manual (Markdown): ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/agent/guide
OpenAPI 3.0 Schema: ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/openapi.json`;

    return (
        <>
            <Head title="Integrations & AI Agents" />
            <div className="flex flex-col gap-8 pb-12">
                <Heading
                    title="Integrations & AI Agents"
                    description="Connect Google Drive for media storage and manage secure API access tokens for your autonomous AI agents."
                />

                {/* Newly Generated API Token Alert */}
                {newApiToken && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                            <Key className="size-5" />
                            <h3 className="font-semibold">
                                New AI Agent Token Created: {newApiToken.name}
                            </h3>
                        </div>
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                            Make sure to copy this token now. For your security,
                            it will never be displayed again. Header:{' '}
                            <code className="font-mono">
                                Authorization: Bearer &lt;token&gt;
                            </code>{' '}
                            or{' '}
                            <code className="font-mono">
                                X-Api-Token: &lt;token&gt;
                            </code>
                            .
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <input
                                readOnly
                                value={newApiToken.token}
                                className="flex-1 rounded border bg-background px-3 py-1.5 font-mono text-xs select-all"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                                onClick={() =>
                                    copyToClipboard(newApiToken.token)
                                }
                            >
                                {copiedToken ? (
                                    <>
                                        <Check className="size-3.5 text-emerald-600" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="size-3.5" />
                                        Copy Token
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* AI Agents & API Access Panel */}
                <section className="lumink-panel overflow-hidden">
                    <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Bot className="size-5 text-primary" />
                                <h2 className="font-semibold">
                                    AI Agent & API Access
                                </h2>
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    v1 REST API
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Allow autonomous AI agents to plan content,
                                define tasks, update statuses, and connect
                                Google Drive shot directories.
                            </p>
                        </div>
                        <Dialog
                            open={createTokenOpen}
                            onOpenChange={setCreateTokenOpen}
                        >
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5">
                                    <Plus className="size-3.5" />
                                    Generate Agent Token
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={submitToken}>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Generate AI Agent Token
                                        </DialogTitle>
                                        <DialogDescription>
                                            Create a secure Bearer token for
                                            your AI agent (e.g. Antigravity,
                                            Cursor, Claude, custom scripts).
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="token-name">
                                                Agent / Integration Name
                                            </Label>
                                            <Input
                                                id="token-name"
                                                placeholder="e.g. Content Strategy AI Agent"
                                                value={tokenForm.data.name}
                                                onChange={(e) =>
                                                    tokenForm.setData(
                                                        'name',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="token-expiration">
                                                Token Expiration
                                            </Label>
                                            <Select
                                                value={
                                                    tokenForm.data
                                                        .expires_in_days
                                                }
                                                onValueChange={(val) =>
                                                    tokenForm.setData(
                                                        'expires_in_days',
                                                        val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="token-expiration">
                                                    <SelectValue placeholder="Select expiration" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="30">
                                                        30 days
                                                    </SelectItem>
                                                    <SelectItem value="90">
                                                        90 days (Recommended)
                                                    </SelectItem>
                                                    <SelectItem value="365">
                                                        1 year
                                                    </SelectItem>
                                                    <SelectItem value="0">
                                                        No expiration
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="rounded-md border p-3 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                <Shield className="size-3.5 text-primary" />
                                                Permissions & Scope
                                            </div>
                                            <p className="mt-1">
                                                This token grants full access to
                                                explore strategy, plan
                                                deliverables, schedule tasks,
                                                and attach Google Drive shot
                                                directories under your account
                                                permissions.
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setCreateTokenOpen(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={tokenForm.processing}
                                        >
                                            {tokenForm.processing
                                                ? 'Generating...'
                                                : 'Generate Token'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Active Tokens Table */}
                    <div className="p-5">
                        <h3 className="text-sm font-semibold">Active Tokens</h3>
                        <div className="mt-3 overflow-hidden rounded-md border">
                            <table className="lumink-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Created</th>
                                        <th>Last Used</th>
                                        <th>Expires</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apiTokens.map((tok) => (
                                        <tr key={tok.id}>
                                            <td className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Key className="size-3.5 text-muted-foreground" />
                                                    <span>{tok.name}</span>
                                                </div>
                                            </td>
                                            <td>{dateTime(tok.created_at)}</td>
                                            <td>
                                                {tok.last_used_at
                                                    ? dateTime(tok.last_used_at)
                                                    : 'Never used'}
                                            </td>
                                            <td>
                                                {tok.expires_at
                                                    ? dateTime(tok.expires_at)
                                                    : 'Never'}
                                            </td>
                                            <td className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() =>
                                                        revokeToken(tok.id)
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    Revoke
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {apiTokens.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="py-8 text-center text-sm text-muted-foreground"
                                            >
                                                No active API tokens. Generate
                                                one to connect your AI agent.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* AI Agent Quickstart & Documentation Hub */}
                    <div className="border-t bg-muted/20 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-xl">
                                <h3 className="text-sm font-semibold">
                                    Agent Instructions & System Prompt
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    Copy and paste this prompt template into
                                    your AI agent so it immediately understands
                                    how Lumink OS works, how to query strategy,
                                    plan content, create tasks, and link Drive
                                    shot folders.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() =>
                                        copyToClipboard(
                                            agentPromptTemplate,
                                            true,
                                        )
                                    }
                                >
                                    {copiedPrompt ? (
                                        <>
                                            <Check className="size-3.5 text-emerald-600" />
                                            Prompt Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="size-3.5" />
                                            Copy Agent Prompt
                                        </>
                                    )}
                                </Button>
                                <Button asChild size="sm" variant="outline">
                                    <a
                                        href="/api/v1/openapi.json"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <FileJson data-icon="inline-start" />
                                        OpenAPI Spec
                                        <ExternalLink data-icon="inline-end" />
                                    </a>
                                </Button>
                                <Button asChild size="sm" variant="ghost">
                                    <a
                                        href="/api/v1/agent/guide"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Agent Manual
                                        <ExternalLink data-icon="inline-end" />
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Google Drive Integration Panel */}
                <section className="lumink-panel overflow-hidden">
                    <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold">Google Drive</h2>
                                <StatusBadge
                                    value={
                                        driveConnection
                                            ? 'connected'
                                            : 'not_connected'
                                    }
                                />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {driveConnection
                                    ? `Connected as ${driveConnection.google_email}`
                                    : 'Create standardized client and campaign folders in one Lumink-owned Drive.'}
                            </p>
                        </div>
                        {driveConnection ? (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.delete(
                                        '/settings/integrations/google-drive',
                                    )
                                }
                            >
                                <Unplug data-icon="inline-start" />
                                Disconnect
                            </Button>
                        ) : (
                            <Button asChild>
                                <a href="/settings/integrations/google-drive">
                                    Connect Google Drive
                                    <ExternalLink data-icon="inline-end" />
                                </a>
                            </Button>
                        )}
                    </div>
                    <div className="p-5">
                        <h3 className="text-sm font-semibold">
                            Client Workspace Folders
                        </h3>
                        <div className="mt-3 flex flex-col divide-y rounded-md border">
                            {businesses.map((business) => (
                                <div
                                    key={business.id}
                                    className="flex items-center justify-between gap-4 p-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {business.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {business.drive_folder_url
                                                ? 'Folder structure provisioned'
                                                : 'No Drive folder yet'}
                                        </p>
                                    </div>
                                    {business.drive_folder_url ? (
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <a
                                                href={business.drive_folder_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <CheckCircle2 data-icon="inline-start" />
                                                Open Drive
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!driveConnection}
                                            onClick={() =>
                                                router.post(
                                                    `/businesses/${business.id}/drive`,
                                                )
                                            }
                                        >
                                            <FolderPlus data-icon="inline-start" />
                                            Create folders
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {businesses.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    No businesses created yet.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
