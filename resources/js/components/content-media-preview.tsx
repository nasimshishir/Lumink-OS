import {
    Clapperboard,
    ExternalLink,
    Film,
    FolderOpen,
    Image as ImageIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export interface ContentMediaPreviewProps {
    title: string;
    type?: string;
    stage?: string;
    thumbnailUrl?: string | null;
    finalAssetUrl?: string | null;
    rawFootageUrl?: string | null;
    driveFolderUrl?: string | null;
    hook?: string | null;
    caption?: string | null;
    className?: string;
    actionTrigger?: ReactNode;
}

function getGoogleDriveEmbedUrl(url: string): string | null {
    if (!url.includes('drive.google.com')) {
        return null;
    }

    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);

    if (fileMatch) {
        return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }

    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (idMatch) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }

    return null;
}

function getYouTubeEmbedUrl(url: string): string | null {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        return null;
    }

    const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]+)/,
    );

    return match
        ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=0&rel=0`
        : null;
}

function getVimeoEmbedUrl(url: string): string | null {
    if (!url.includes('vimeo.com')) {
        return null;
    }

    const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);

    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function isVideoUrl(url: string): boolean {
    const cleanUrl = url.split('?')[0].toLowerCase();

    return ['.mp4', '.mov', '.webm', '.ogg', '.m4v'].some((ext) =>
        cleanUrl.endsWith(ext),
    );
}

function isImageUrl(url: string): boolean {
    const cleanUrl = url.split('?')[0].toLowerCase();

    return ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif'].some(
        (ext) => cleanUrl.endsWith(ext),
    );
}

export function ContentMediaPreview({
    title,
    type = 'reel',
    thumbnailUrl,
    finalAssetUrl,
    rawFootageUrl,
    driveFolderUrl,
    hook,
    className = '',
    actionTrigger,
}: ContentMediaPreviewProps) {
    // 1. Final Asset Embeds (Drive, YouTube, Vimeo)
    if (finalAssetUrl) {
        const driveEmbed = getGoogleDriveEmbedUrl(finalAssetUrl);

        if (driveEmbed) {
            return (
                <div
                    className={`relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden rounded-md bg-black ${className}`}
                >
                    <iframe
                        src={driveEmbed}
                        className="h-full w-full border-0"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                        title={title}
                    />
                    <a
                        href={finalAssetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black"
                    >
                        <ExternalLink className="size-3" />
                        <span>Open Drive</span>
                    </a>
                </div>
            );
        }

        const ytEmbed = getYouTubeEmbedUrl(finalAssetUrl);

        if (ytEmbed) {
            return (
                <div
                    className={`relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden rounded-md bg-black ${className}`}
                >
                    <iframe
                        src={ytEmbed}
                        className="h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={title}
                    />
                </div>
            );
        }

        const vimeoEmbed = getVimeoEmbedUrl(finalAssetUrl);

        if (vimeoEmbed) {
            return (
                <div
                    className={`relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden rounded-md bg-black ${className}`}
                >
                    <iframe
                        src={vimeoEmbed}
                        className="h-full w-full border-0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={title}
                    />
                </div>
            );
        }

        // Direct HTML5 Video
        if (isVideoUrl(finalAssetUrl)) {
            return (
                <div
                    className={`relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden rounded-md bg-black ${className}`}
                >
                    <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={thumbnailUrl || undefined}
                        className="h-full w-full object-contain"
                    >
                        <source src={finalAssetUrl} />
                        Your browser does not support HTML5 video.
                    </video>
                </div>
            );
        }

        // Direct Image as Final Asset
        if (isImageUrl(finalAssetUrl)) {
            return (
                <div
                    className={`relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden rounded-md bg-black ${className}`}
                >
                    <img
                        src={finalAssetUrl}
                        alt={title}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                        <span className="rounded bg-primary/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary-foreground uppercase">
                            {type}
                        </span>
                        <p className="mt-1 line-clamp-2 text-xs font-medium text-white/90">
                            {title}
                        </p>
                    </div>
                </div>
            );
        }
    }

    // 2. Thumbnail / Cover Image (with or without finalAssetUrl)
    if (thumbnailUrl) {
        return (
            <div
                className={`relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden rounded-md bg-black ${className}`}
            >
                <img
                    src={thumbnailUrl}
                    alt={title}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
                    <span className="rounded bg-primary/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary-foreground uppercase">
                        {type}
                    </span>
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-white/90">
                        {title}
                    </p>
                    {finalAssetUrl && (
                        <div className="mt-2.5">
                            <a
                                href={finalAssetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-white/30"
                            >
                                <ExternalLink className="size-3" />
                                <span>View final export</span>
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 3. Fallback: Deliverable Canvas (Clean, dynamic database-driven placeholder)
    return (
        <div
            className={`relative mx-auto flex aspect-[9/16] max-h-[520px] w-full flex-col justify-between overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 p-5 text-white shadow-inner ${className}`}
        >
            <div className="flex items-center justify-between">
                <span className="rounded bg-primary/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary-foreground uppercase">
                    {type}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Clapperboard className="size-3.5" />
                    <span>Lumink Deliverable</span>
                </span>
            </div>

            <div className="my-auto flex flex-col items-center px-2 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-400 shadow-md">
                    {type === 'static' || type === 'carousel' ? (
                        <ImageIcon className="size-6 text-primary/80" />
                    ) : (
                        <Film className="size-6 text-primary/80" />
                    )}
                </div>
                <h3 className="mt-4 line-clamp-3 text-sm leading-snug font-semibold text-neutral-100">
                    {title}
                </h3>
                {hook ? (
                    <p className="mt-2 line-clamp-3 text-xs text-neutral-400 italic">
                        &ldquo;{hook}&rdquo;
                    </p>
                ) : (
                    <p className="mt-2 text-[11px] text-neutral-500">
                        No preview media uploaded yet.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
                {finalAssetUrl && (
                    <a
                        href={finalAssetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-md bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
                    >
                        <ExternalLink className="size-3.5" />
                        <span>Open final asset link</span>
                    </a>
                )}
                {driveFolderUrl && (
                    <a
                        href={driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                        <FolderOpen className="size-3.5" />
                        <span>Google Drive folder</span>
                    </a>
                )}
                {rawFootageUrl && !driveFolderUrl && (
                    <a
                        href={rawFootageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800"
                    >
                        <ExternalLink className="size-3.5" />
                        <span>Raw footage assets</span>
                    </a>
                )}
                {actionTrigger && (
                    <div className="mt-1 flex justify-center">
                        {actionTrigger}
                    </div>
                )}
            </div>
        </div>
    );
}
