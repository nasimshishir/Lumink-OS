import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
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

export function DeleteContentDialog({
    contentId,
    contentTitle,
    trigger,
    onDeleted,
}: {
    contentId: number;
    contentTitle: string;
    trigger?: React.ReactNode;
    onDeleted?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    function handleDelete() {
        setLoading(true);
        router.delete(`/content/${contentId}`, {
            preserveScroll: false,
            onFinish: () => setLoading(false),
            onSuccess: () => {
                setOpen(false);
                onDeleted?.();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                        title="Move to Recycle Bin"
                    >
                        <Trash2 className="size-3.5" />
                        <span>Delete content</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Move Content to Recycle Bin?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to move{' '}
                        <strong>"{contentTitle}"</strong> to the Recycle Bin?
                        All attached tasks, approvals, and platforms will be
                        moved with it and can be restored anytime.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={loading}
                        onClick={handleDelete}
                    >
                        {loading ? 'Deleting...' : 'Move to Recycle Bin'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
