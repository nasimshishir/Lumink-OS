import { useForm } from '@inertiajs/react';
import { FormEvent, useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export function EditContentDetailsDialog({
    content,
}: {
    content: {
        id: number;
        brief?: string;
        hook?: string;
        script?: string;
        cta?: string;
        target_audience?: string;
        featured_items?: string[];
        shoot_notes?: string;
    };
}) {
    const [open, setOpen] = useState(false);
    const getDefaults = () => ({
        brief: content.brief ?? '',
        hook: content.hook ?? '',
        script: content.script ?? '',
        cta: content.cta ?? '',
        target_audience: content.target_audience ?? '',
        featured_items: content.featured_items ? content.featured_items.join(', ') : '',
        shoot_notes: content.shoot_notes ?? '',
    });

    const form = useForm(getDefaults());

    useEffect(() => {
        if (open) {
            form.setData(getDefaults());
        }
    }, [open, content]);

    function submit(event: FormEvent) {
        event.preventDefault();
        
        form.patch(`/content/${content.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Edit2 data-icon="inline-start" />
                    Edit details
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl sm:max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Brief & details</DialogTitle>
                    <DialogDescription>
                        Update the production and creative details for this content.
                    </DialogDescription>
                </DialogHeader>

                <form id="edit-details-form" onSubmit={submit}>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brief">Content brief</Label>
                            <Textarea
                                id="brief"
                                placeholder="Describe the overall concept..."
                                value={form.data.brief}
                                onChange={(e) => form.setData('brief', e.target.value)}
                                className="min-h-[100px]"
                            />
                            {form.errors.brief && <p className="text-sm text-red-500">{form.errors.brief}</p>}
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="hook">Hook</Label>
                            <Textarea
                                id="hook"
                                placeholder="First 3 seconds (visual & audio)..."
                                value={form.data.hook}
                                onChange={(e) => form.setData('hook', e.target.value)}
                                className="min-h-[60px]"
                            />
                            {form.errors.hook && <p className="text-sm text-red-500">{form.errors.hook}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="script">Script / caption master</Label>
                            <Textarea
                                id="script"
                                placeholder="The spoken script or main caption..."
                                value={form.data.script}
                                onChange={(e) => form.setData('script', e.target.value)}
                                className="min-h-[120px]"
                            />
                            {form.errors.script && <p className="text-sm text-red-500">{form.errors.script}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="cta">Call to action</Label>
                            <Textarea
                                id="cta"
                                placeholder="What should the audience do next?"
                                value={form.data.cta}
                                onChange={(e) => form.setData('cta', e.target.value)}
                                className="min-h-[60px]"
                            />
                            {form.errors.cta && <p className="text-sm text-red-500">{form.errors.cta}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="target_audience">Target audience</Label>
                            <Textarea
                                id="target_audience"
                                placeholder="Who is this content for?"
                                value={form.data.target_audience}
                                onChange={(e) => form.setData('target_audience', e.target.value)}
                                className="min-h-[60px]"
                            />
                            {form.errors.target_audience && <p className="text-sm text-red-500">{form.errors.target_audience}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="shoot_notes">Shoot notes</Label>
                            <Textarea
                                id="shoot_notes"
                                placeholder="Props, locations, specific shots needed..."
                                value={form.data.shoot_notes}
                                onChange={(e) => form.setData('shoot_notes', e.target.value)}
                                className="min-h-[80px]"
                            />
                            {form.errors.shoot_notes && <p className="text-sm text-red-500">{form.errors.shoot_notes}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="featured_items">Featured menu items (comma-separated)</Label>
                            <Input
                                id="featured_items"
                                placeholder="e.g. Pasta, Burger, Fries"
                                value={form.data.featured_items}
                                onChange={(e) => form.setData('featured_items', e.target.value)}
                            />
                            {form.errors.featured_items && <p className="text-sm text-red-500">{form.errors.featured_items}</p>}
                        </div>
                    </div>
                </form>

                <DialogFooter>
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
                        {form.processing ? 'Saving...' : 'Save details'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
