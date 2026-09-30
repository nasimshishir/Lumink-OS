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

export function DeleteTaskDialog({
    taskId,
    taskTitle,
    trigger,
    onDeleted,
}: {
    taskId: number;
    taskTitle: string;
    trigger?: React.ReactNode;
    onDeleted?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    function handleDelete() {
        setLoading(true);
        router.delete(`/tasks/${taskId}`, {
            preserveScroll: true,
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
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                        title="Delete task"
                    >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only sm:not-sr-only">Delete</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Move Task to Recycle Bin?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to move{' '}
                        <strong>"{taskTitle}"</strong> to the Recycle Bin? You
                        can restore it anytime from the global Recycle Bin.
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
