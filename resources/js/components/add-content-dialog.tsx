import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
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

type Option = { id: number; name: string };

export function AddContentDialog({
    businesses = [],
    businessId,
}: {
    businesses?: Option[];
    businessId?: number;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        title: '',
        business_id: businessId ? String(businessId) : '',
        type: 'reel',
        publish_at: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/content', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus data-icon="inline-start" />
                    Add content
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Add content</DialogTitle>
                        <DialogDescription>
                            Create a new piece of content to plan, produce, and approve.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="content-title">Content title</Label>
                        <Input
                            id="content-title"
                            value={form.data.title}
                            onChange={(event) =>
                                form.setData('title', event.target.value)
                            }
                            required
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {!businessId && (
                            <div className="flex flex-col gap-2">
                                <Label>Business</Label>
                                <Select
                                    value={form.data.business_id}
                                    onValueChange={(value) =>
                                        form.setData('business_id', value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select business" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {businesses.map((business) => (
                                                <SelectItem
                                                    key={business.id}
                                                    value={String(business.id)}
                                                >
                                                    {business.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <Label>Content type</Label>
                            <Select
                                value={form.data.type}
                                onValueChange={(value) =>
                                    form.setData('type', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="reel">Reel</SelectItem>
                                        <SelectItem value="story">Story</SelectItem>
                                        <SelectItem value="static">Static Image</SelectItem>
                                        <SelectItem value="carousel">Carousel</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-full flex flex-col gap-2">
                            <Label htmlFor="content-publish">Publish date</Label>
                            <Input
                                id="content-publish"
                                type="datetime-local"
                                value={form.data.publish_at}
                                onChange={(event) =>
                                    form.setData('publish_at', event.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={form.processing}>
                            Create content
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
