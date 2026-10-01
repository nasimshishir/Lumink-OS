import { router } from '@inertiajs/react';
import {
    Copy,
    ExternalLink,
    Image as ImageIcon,
    Lightbulb,
    Link2,
    Loader2,
    Maximize2,
    Plus,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface ContentInspiration {
    id: number;
    content_item_id: number;
    type: 'link' | 'image' | 'video' | 'note';
    title: string;
    url?: string | null;
    image_path?: string | null;
    image_url?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    position?: number;
    created_at: string;
    user_id?: number | null;
    user?: { id: number; name: string; avatar?: string } | null;
}

interface ContentInspirationSectionProps {
    contentId: number;
    inspirations?: ContentInspiration[];
    canManageInspirations?: boolean;
}

export function ContentInspirationSection({
    contentId,
    inspirations = [],
    canManageInspirations = true,
}: ContentInspirationSectionProps) {
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'image' | 'link'>('all');
    const [lightboxImage, setLightboxImage] = useState<{
        url: string;
        title: string;
    } | null>(null);

    const filtered = inspirations.filter((item) => {
        if (filter === 'image') {
            return item.type === 'image' || Boolean(item.image_url);
        }

        if (filter === 'link') {
            return item.type === 'link' || Boolean(item.url);
        }

        return true;
    });

    const imageCount = inspirations.filter(
        (i) => i.type === 'image' || Boolean(i.image_url),
    ).length;
    const linkCount = inspirations.filter(
        (i) => i.type === 'link' || Boolean(i.url),
    ).length;

    function handleDelete(inspiration: ContentInspiration) {
        if (!confirm(`Delete inspiration reference "${inspiration.title}"?`)) {
            return;
        }

        router.delete(`/content/${contentId}/inspirations/${inspiration.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <section className="lumink-panel overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Sparkles className="size-4" />
                    </span>
                    <h2 className="font-semibold text-foreground">
                        Inspiration & Creative References
                    </h2>
                    <Badge variant="outline" className="text-xs font-semibold">
                        {inspirations.length}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter tabs */}
                    {inspirations.length > 0 && (
                        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={cn(
                                    'rounded px-2.5 py-1 font-medium transition-colors',
                                    filter === 'all'
                                        ? 'bg-background font-semibold text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                All ({inspirations.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter('image')}
                                className={cn(
                                    'rounded px-2.5 py-1 font-medium transition-colors',
                                    filter === 'image'
                                        ? 'bg-background font-semibold text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Images ({imageCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter('link')}
                                className={cn(
                                    'rounded px-2.5 py-1 font-medium transition-colors',
                                    filter === 'link'
                                        ? 'bg-background font-semibold text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Links ({linkCount})
                            </button>
                        </div>
                    )}

                    {canManageInspirations && (
                        <Button
                            size="sm"
                            variant="default"
                            onClick={() => setAddDialogOpen(true)}
                            className="h-8 gap-1.5 px-3 text-xs"
                        >
                            <Plus className="size-3.5" />
                            Add Inspiration
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid of inspiration items */}
            {filtered.length > 0 ? (
                <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((item) => (
                        <InspirationCard
                            key={item.id}
                            item={item}
                            onDelete={() => handleDelete(item)}
                            onZoom={(url, title) =>
                                setLightboxImage({ url, title })
                            }
                            canDelete={canManageInspirations}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Lightbulb className="size-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                        No creative inspiration references yet
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        Save reference Reels, TikToks, YouTube links, competitor
                        ads, moodboard stills, or screenshots to guide the
                        creator, shooter, and editor.
                    </p>
                    {canManageInspirations && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddDialogOpen(true)}
                            className="mt-4 h-8 gap-1.5 text-xs"
                        >
                            <Plus className="size-3.5" />
                            Add First Inspiration
                        </Button>
                    )}
                </div>
            )}

            {/* Add inspiration dialog */}
            <AddInspirationDialog
                contentId={contentId}
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
            />

            {/* Lightbox Modal */}
            {lightboxImage && (
                <Dialog
                    open={Boolean(lightboxImage)}
                    onOpenChange={() => setLightboxImage(null)}
                >
                    <DialogContent className="max-w-4xl overflow-hidden border-none bg-black/95 p-2 text-white">
                        <div className="relative flex max-h-[85vh] flex-col items-center justify-center">
                            <img
                                src={lightboxImage.url}
                                alt={lightboxImage.title}
                                className="max-h-[75vh] w-auto rounded object-contain"
                            />
                            <p className="mt-2 text-center text-xs font-medium text-white/80">
                                {lightboxImage.title}
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </section>
    );
}

function InspirationCard({
    item,
    onDelete,
    onZoom,
    canDelete,
}: {
    item: ContentInspiration;
    onDelete: () => void;
    onZoom: (url: string, title: string) => void;
    canDelete: boolean;
}) {
    const isImage = Boolean(item.image_url);
    const isUrl = Boolean(item.url);

    // Platform detection for nice badge
    let platform = 'Web Reference';
    let platformColor = 'bg-slate-500/10 text-slate-700 dark:text-slate-300';

    if (item.url?.includes('instagram.com')) {
        platform = 'Instagram';
        platformColor = 'bg-pink-500/10 text-pink-700 dark:text-pink-400';
    } else if (item.url?.includes('tiktok.com')) {
        platform = 'TikTok';
        platformColor = 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400';
    } else if (
        item.url?.includes('youtube.com') ||
        item.url?.includes('youtu.be')
    ) {
        platform = 'YouTube';
        platformColor = 'bg-red-500/10 text-red-700 dark:text-red-400';
    } else if (item.url?.includes('pinterest.com')) {
        platform = 'Pinterest';
        platformColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-400';
    }

    function copyLink() {
        if (item.url) {
            navigator.clipboard.writeText(item.url);
        }
    }

    return (
        <div className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50 hover:shadow-sm">
            {/* Image Preview if image */}
            {isImage && item.image_url && (
                <div
                    className="relative aspect-video w-full cursor-pointer overflow-hidden bg-muted"
                    onClick={() => onZoom(item.image_url!, item.title)}
                >
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                            <Maximize2 className="size-3" />
                            Expand Preview
                        </span>
                    </div>
                </div>
            )}

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-3 text-xs">
                {/* Platform / Source Tag */}
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    {isUrl ? (
                        <Badge
                            variant="outline"
                            className={cn(
                                'border-transparent px-2 py-0.5 text-[10px] font-semibold',
                                platformColor,
                            )}
                        >
                            <Link2 className="mr-1 inline size-3" />
                            {platform}
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="border-transparent bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400"
                        >
                            <ImageIcon className="mr-1 inline size-3" />
                            Visual Moodboard
                        </Badge>
                    )}

                    {canDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            title="Delete inspiration"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    )}
                </div>

                <h4 className="mb-1 line-clamp-1 text-sm font-semibold text-foreground">
                    {item.title}
                </h4>

                {/* Notes / Takeaway */}
                {item.notes && (
                    <p className="mb-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                        {item.notes}
                    </p>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1 pt-2">
                        {item.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer link or actions */}
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                        <Avatar className="size-4 shrink-0">
                            <AvatarImage src={item.user?.avatar} />
                            <AvatarFallback className="text-[8px]">
                                {item.user?.name?.slice(0, 2) ?? '—'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                            {item.user?.name ?? 'Team'}
                        </span>
                    </div>

                    {isUrl && item.url && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={copyLink}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Copy reference link"
                            >
                                <Copy className="size-3" />
                            </button>
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-6 gap-1 px-2 text-[10px]"
                            >
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open
                                    <ExternalLink className="size-2.5" />
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface AddInspirationDialogProps {
    contentId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function AddInspirationDialog({
    contentId,
    open,
    onOpenChange,
}: AddInspirationDialogProps) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'link' | 'image'>('link');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setType('image');
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);

        if (url) {
            formData.append('url', url);
        }

        if (notes) {
            formData.append('notes', notes);
        }

        if (tags) {
            formData.append('tags', tags);
        }

        if (imageFile) {
            formData.append('image', imageFile);
        }

        router.post(`/content/${contentId}/inspirations`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                setTitle('');
                setUrl('');
                setNotes('');
                setTags('');
                setImageFile(null);
                setPreviewUrl(null);
                onOpenChange(false);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <Sparkles className="size-4 text-amber-500" />
                        Add Creative Inspiration Reference
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Save competitor reels, moodboard images, pacing
                        references, or audio trends to model.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4 py-2 text-xs"
                >
                    {/* Type toggle */}
                    <div className="flex rounded-lg border bg-muted/40 p-1">
                        <button
                            type="button"
                            onClick={() => setType('link')}
                            className={cn(
                                'flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-medium transition-colors',
                                type === 'link'
                                    ? 'bg-background font-semibold text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Link2 className="size-3.5" />
                            Social / Web URL
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('image')}
                            className={cn(
                                'flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-medium transition-colors',
                                type === 'image'
                                    ? 'bg-background font-semibold text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <ImageIcon className="size-3.5" />
                            Upload Image / Moodboard
                        </button>
                    </div>

                    {/* Title */}
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="insp-title"
                            className="text-xs font-semibold"
                        >
                            Title / Reference Name *
                        </Label>
                        <Input
                            id="insp-title"
                            placeholder="e.g. Fast Hook Pace reference (Nike Ad), Aesthetic typography"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="h-9 text-xs"
                        />
                    </div>

                    {/* URL Input */}
                    {type === 'link' && (
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="insp-url"
                                className="text-xs font-semibold"
                            >
                                Reference URL (Instagram, TikTok, YouTube, etc.)
                            </Label>
                            <Input
                                id="insp-url"
                                type="url"
                                placeholder="https://instagram.com/reel/... or https://tiktok.com/@..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    )}

                    {/* Image Upload Input */}
                    {type === 'image' && (
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="insp-image"
                                className="text-xs font-semibold"
                            >
                                Upload Screenshot or Image
                            </Label>
                            <Input
                                id="insp-image"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="h-9 cursor-pointer text-xs file:text-xs file:font-semibold"
                            />
                            {previewUrl && (
                                <div className="relative mt-2 aspect-video w-full overflow-hidden rounded border bg-muted">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null);
                                            setPreviewUrl(null);
                                        }}
                                        className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="insp-notes"
                            className="text-xs font-semibold"
                        >
                            Creative Takeaways / What to Model
                        </Label>
                        <Textarea
                            id="insp-notes"
                            placeholder="Notice the rapid sound cuts at 0:02, use similar text font, replicate the split-screen layout..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="text-xs"
                        />
                    </div>

                    {/* Tags */}
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="insp-tags"
                            className="text-xs font-semibold"
                        >
                            Tags (comma separated)
                        </Label>
                        <Input
                            id="insp-tags"
                            placeholder="hook, audio, lighting, typography, transition"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <DialogFooter className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-8 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmitting || !title.trim()}
                            className="h-8 gap-1.5 text-xs"
                        >
                            {isSubmitting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Plus className="size-3.5" />
                            )}
                            Save Inspiration
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
