import { useForm } from '@inertiajs/react';
import { Edit2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
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
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type UserOption = { id: number; name: string };
type ShootOption = {
    id: number;
    title: string;
    starts_at: string;
    drive_folder_url?: string | null;
    broll_tags?: string[] | null;
};

export function EditContentDetailsDialog({
    content,
    users = [],
    availableShoots = [],
    trigger,
}: {
    content: {
        id: number;
        title?: string;
        type?: string;
        priority?: string;
        primary_shoot_id?: number | null;
        referenced_shoot_ids?: number[] | null;
        publish_at?: string;
        owner_id?: number | null;
        owner?: { id?: number; name?: string } | null;
        brief?: string;
        hook?: string;
        script?: string;
        cta?: string;
        target_audience?: string;
        featured_items?: string[];
        shoot_notes?: string;
        drive_folder_url?: string;
        raw_footage_url?: string;
        final_asset_url?: string;
    };
    users?: UserOption[];
    availableShoots?: ShootOption[];
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    const formatForInput = (dateStr?: string | null) => {
        if (!dateStr) {
            return '';
        }

        try {
            const d = new Date(dateStr);

            if (isNaN(d.getTime())) {
                return '';
            }

            const pad = (n: number) => String(n).padStart(2, '0');

            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
            return '';
        }
    };

    const getDefaults = () => ({
        title: content.title ?? '',
        type: content.type ?? 'reel',
        priority: content.priority ?? 'medium',
        primary_shoot_id: content.primary_shoot_id
            ? String(content.primary_shoot_id)
            : 'none',
        referenced_shoot_ids: content.referenced_shoot_ids ?? ([] as number[]),
        publish_at: formatForInput(content.publish_at),
        owner_id: content.owner_id
            ? String(content.owner_id)
            : content.owner?.id
              ? String(content.owner.id)
              : null,
        brief: content.brief ?? '',
        hook: content.hook ?? '',
        script: content.script ?? '',
        cta: content.cta ?? '',
        target_audience: content.target_audience ?? '',
        featured_items: content.featured_items
            ? content.featured_items.join(', ')
            : '',
        shoot_notes: content.shoot_notes ?? '',
        drive_folder_url: content.drive_folder_url ?? '',
        raw_footage_url: content.raw_footage_url ?? '',
        final_asset_url: content.final_asset_url ?? '',
    });

    const form = useForm(getDefaults());

    function handleOpenChange(nextOpen: boolean) {
        if (nextOpen) {
            form.setData(getDefaults());
        }

        setOpen(nextOpen);
    }

    function toggleReferencedShoot(shootId: number) {
        const current = form.data.referenced_shoot_ids;

        if (current.includes(shootId)) {
            form.setData(
                'referenced_shoot_ids',
                current.filter((id) => id !== shootId),
            );
        } else {
            form.setData('referenced_shoot_ids', [...current, shootId]);
        }
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            primary_shoot_id:
                data.primary_shoot_id === 'none' || !data.primary_shoot_id
                    ? null
                    : Number(data.primary_shoot_id),
        }));

        form.patch(`/content/${content.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button variant="ghost" size="sm">
                        <Edit2 data-icon="inline-start" />
                        Edit details
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Content Details</DialogTitle>
                    <DialogDescription>
                        Update the deliverables, timeline, owner, and creative
                        strategy for this asset.
                    </DialogDescription>
                </DialogHeader>

                <form id="edit-details-form" onSubmit={submit}>
                    <div className="grid gap-5 py-4">
                        {/* Core Deliverable Settings */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2 sm:col-span-2">
                                <Label htmlFor="content-title">Title</Label>
                                <Input
                                    id="content-title"
                                    value={form.data.title}
                                    onChange={(e) =>
                                        form.setData('title', e.target.value)
                                    }
                                    required
                                />
                                {form.errors.title && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Content Type</Label>
                                <Select
                                    value={form.data.type}
                                    onValueChange={(val) =>
                                        form.setData('type', val)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="reel">
                                                Reel / Video
                                            </SelectItem>
                                            <SelectItem value="story">
                                                Story
                                            </SelectItem>
                                            <SelectItem value="static">
                                                Static Post
                                            </SelectItem>
                                            <SelectItem value="carousel">
                                                Carousel
                                            </SelectItem>
                                            <SelectItem value="other">
                                                Other
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {form.errors.type && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.type}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={form.data.priority}
                                    onValueChange={(val) =>
                                        form.setData('priority', val)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="low">
                                                Low
                                            </SelectItem>
                                            <SelectItem value="medium">
                                                Medium
                                            </SelectItem>
                                            <SelectItem value="high">
                                                High
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {form.errors.priority && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.priority}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="content-publish-at">
                                    Publish Date
                                </Label>
                                <Input
                                    id="content-publish-at"
                                    type="datetime-local"
                                    value={form.data.publish_at || ''}
                                    onChange={(e) =>
                                        form.setData(
                                            'publish_at',
                                            e.target.value,
                                        )
                                    }
                                />
                                {form.errors.publish_at && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.publish_at}
                                    </p>
                                )}
                            </div>

                            {users.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <Label>Owner / Assignee</Label>
                                    <Select
                                        value={form.data.owner_id || 'none'}
                                        onValueChange={(val) =>
                                            form.setData(
                                                'owner_id',
                                                val === 'none' ? null : val,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="none">
                                                    Unassigned
                                                </SelectItem>
                                                {users.map((u) => (
                                                    <SelectItem
                                                        key={u.id}
                                                        value={String(u.id)}
                                                    >
                                                        {u.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.owner_id && (
                                        <p className="text-sm text-red-500">
                                            {form.errors.owner_id}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <hr className="my-1 border-border/60" />

                        {/* Creative Details */}
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="brief">Content brief</Label>
                                <Textarea
                                    id="brief"
                                    placeholder="Describe the overall concept..."
                                    value={form.data.brief}
                                    onChange={(e) =>
                                        form.setData('brief', e.target.value)
                                    }
                                    className="min-h-[90px]"
                                />
                                {form.errors.brief && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.brief}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="hook">Hook</Label>
                                <Textarea
                                    id="hook"
                                    placeholder="First 3 seconds (visual & audio)..."
                                    value={form.data.hook}
                                    onChange={(e) =>
                                        form.setData('hook', e.target.value)
                                    }
                                    className="min-h-[55px]"
                                />
                                {form.errors.hook && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.hook}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="script">
                                    Script / caption master
                                </Label>
                                <Textarea
                                    id="script"
                                    placeholder="The spoken script or main caption..."
                                    value={form.data.script}
                                    onChange={(e) =>
                                        form.setData('script', e.target.value)
                                    }
                                    className="min-h-[100px]"
                                />
                                {form.errors.script && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.script}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cta">Call to action</Label>
                                <Textarea
                                    id="cta"
                                    placeholder="What should the audience do next?"
                                    value={form.data.cta}
                                    onChange={(e) =>
                                        form.setData('cta', e.target.value)
                                    }
                                    className="min-h-[55px]"
                                />
                                {form.errors.cta && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.cta}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="target_audience">
                                    Target audience
                                </Label>
                                <Textarea
                                    id="target_audience"
                                    placeholder="Who is this content for?"
                                    value={form.data.target_audience}
                                    onChange={(e) =>
                                        form.setData(
                                            'target_audience',
                                            e.target.value,
                                        )
                                    }
                                    className="min-h-[55px]"
                                />
                                {form.errors.target_audience && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.target_audience}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="shoot_notes">Shoot notes</Label>
                                <Textarea
                                    id="shoot_notes"
                                    placeholder="Props, locations, specific shots needed..."
                                    value={form.data.shoot_notes}
                                    onChange={(e) =>
                                        form.setData(
                                            'shoot_notes',
                                            e.target.value,
                                        )
                                    }
                                    className="min-h-[70px]"
                                />
                                {form.errors.shoot_notes && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.shoot_notes}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="featured_items">
                                    Featured menu items (comma-separated)
                                </Label>
                                <Input
                                    id="featured_items"
                                    placeholder="e.g. Pasta, Burger, Fries"
                                    value={form.data.featured_items}
                                    onChange={(e) =>
                                        form.setData(
                                            'featured_items',
                                            e.target.value,
                                        )
                                    }
                                />
                                {form.errors.featured_items && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.featured_items}
                                    </p>
                                )}
                            </div>

                            {availableShoots.length > 0 && (
                                <div className="grid gap-3 border-t pt-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="primary_shoot_id">
                                            Primary Shoot Session
                                        </Label>
                                        <Select
                                            value={form.data.primary_shoot_id}
                                            onValueChange={(val) => {
                                                form.setData(
                                                    'primary_shoot_id',
                                                    val,
                                                );

                                                if (val !== 'none') {
                                                    const shoot =
                                                        availableShoots.find(
                                                            (s) =>
                                                                String(s.id) ===
                                                                val,
                                                        );

                                                    if (
                                                        shoot?.drive_folder_url &&
                                                        !form.data
                                                            .drive_folder_url
                                                    ) {
                                                        form.setData(
                                                            'drive_folder_url',
                                                            shoot.drive_folder_url,
                                                        );
                                                    }
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="primary_shoot_id">
                                                <SelectValue placeholder="Select primary shoot session" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="none">
                                                        None / Independent Shoot
                                                    </SelectItem>
                                                    {availableShoots.map(
                                                        (shoot) => (
                                                            <SelectItem
                                                                key={shoot.id}
                                                                value={String(
                                                                    shoot.id,
                                                                )}
                                                            >
                                                                {shoot.title} (
                                                                {new Date(
                                                                    shoot.starts_at,
                                                                ).toLocaleDateString()}
                                                                )
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>
                                            Referenced B-Roll Shoots (Archive
                                            Footage)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Select past shoots whose B-roll or
                                            footage will be reused for this
                                            deliverable.
                                        </p>
                                        <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto rounded-md border p-2 text-xs">
                                            {availableShoots.map((shoot) => {
                                                const isSelected =
                                                    form.data.referenced_shoot_ids.includes(
                                                        shoot.id,
                                                    );

                                                return (
                                                    <label
                                                        key={shoot.id}
                                                        className={`flex cursor-pointer items-center justify-between rounded p-1.5 transition-colors ${
                                                            isSelected
                                                                ? 'bg-primary/10 font-medium text-primary'
                                                                : 'hover:bg-muted'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    isSelected
                                                                }
                                                                onChange={() =>
                                                                    toggleReferencedShoot(
                                                                        shoot.id,
                                                                    )
                                                                }
                                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                            />
                                                            <span>
                                                                {shoot.title}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {new Date(
                                                                shoot.starts_at,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-2 border-t pt-3">
                                <Label htmlFor="drive_folder_url">
                                    Google Drive shots directory
                                </Label>
                                <Input
                                    id="drive_folder_url"
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    value={form.data.drive_folder_url}
                                    onChange={(e) =>
                                        form.setData(
                                            'drive_folder_url',
                                            e.target.value,
                                        )
                                    }
                                />
                                {form.errors.drive_folder_url && (
                                    <p className="text-sm text-red-500">
                                        {form.errors.drive_folder_url}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="raw_footage_url">
                                    Raw footage / assets link
                                </Label>
                                <Input
                                    id="raw_footage_url"
                                    placeholder="https://..."
                                    value={form.data.raw_footage_url}
                                    onChange={(e) =>
                                        form.setData(
                                            'raw_footage_url',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="final_asset_url">
                                    Final export asset URL
                                </Label>
                                <Input
                                    id="final_asset_url"
                                    placeholder="https://..."
                                    value={form.data.final_asset_url}
                                    onChange={(e) =>
                                        form.setData(
                                            'final_asset_url',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </form>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="edit-details-form"
                        disabled={form.processing}
                    >
                        {form.processing ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
