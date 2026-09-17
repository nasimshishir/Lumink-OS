import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Search } from 'lucide-react';
import { useState } from 'react';
import { AddContentDialog } from '@/components/add-content-dialog';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dateTime, humanize } from '@/lib/format';

type Content = {
    id: number;
    title: string;
    type: string;
    stage: string;
    priority: string;
    publish_at?: string;
    business: { id: number; name: string };
    campaign?: { name: string };
    owner?: { name: string };
};

export default function ContentIndex({
    content,
    stages,
    businesses,
}: {
    content: Content[];
    stages: string[];
    businesses: { id: number; name: string }[];
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBusiness, setFilterBusiness] = useState('all');

    const filteredContent = content.filter((item) => {
        const matchesSearch =
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBusiness =
            filterBusiness === 'all' ||
            item.business.id.toString() === filterBusiness;

        return matchesSearch && matchesBusiness;
    });

    return (
        <>
            <Head title="Content" />
            <PageHeading
                title="Content"
                description="Plan, produce, approve, schedule, and publish every asset."
                actions={<AddContentDialog businesses={businesses} />}
            />
            <main className="flex flex-col gap-5 p-5">
                <section className="lumink-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Search content…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select
                        value={filterBusiness}
                        onValueChange={setFilterBusiness}
                    >
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="All businesses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">
                                    All businesses
                                </SelectItem>
                                {businesses.map((business) => (
                                    <SelectItem
                                        key={business.id}
                                        value={business.id.toString()}
                                    >
                                        {business.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </section>
                <section
                    className="grid gap-3 overflow-x-auto pb-2"
                    style={{
                        gridTemplateColumns: `repeat(${stages.length}, minmax(240px, 1fr))`,
                    }}
                >
                    {stages.map((stage) => {
                        const items = filteredContent.filter(
                            (item) => item.stage === stage,
                        );

                        return (
                            <div
                                key={stage}
                                className="lumink-panel min-w-60 overflow-hidden"
                            >
                                <div className="flex items-center justify-between border-b px-3 py-3">
                                    <h2 className="text-sm font-semibold">
                                        {humanize(stage)}
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        {items.length}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 p-2">
                                    {items.map((item) => (
                                        <Link
                                            href={`/content/${item.id}`}
                                            key={item.id}
                                            className="rounded-md border bg-white p-3 transition-colors hover:border-primary"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold">
                                                    {item.title}
                                                </p>
                                                <StatusBadge
                                                    value={item.priority}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.business.name} ·{' '}
                                                {humanize(item.type)}
                                            </p>
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                {dateTime(item.publish_at)}
                                            </p>
                                        </Link>
                                    ))}
                                    {items.length === 0 && (
                                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                                            No content in this stage
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>
                <section className="lumink-panel overflow-hidden">
                    <table className="lumink-table">
                        <thead>
                            <tr>
                                <th>Content</th>
                                <th>Business</th>
                                <th>Campaign</th>
                                <th>Owner</th>
                                <th>Publish</th>
                                <th>Stage</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContent.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <p className="font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {humanize(item.type)}
                                        </p>
                                    </td>
                                    <td>{item.business.name}</td>
                                    <td>{item.campaign?.name ?? '—'}</td>
                                    <td>{item.owner?.name ?? 'Unassigned'}</td>
                                    <td>{dateTime(item.publish_at)}</td>
                                    <td>
                                        <StatusBadge value={item.stage} />
                                    </td>
                                    <td>
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <Link href={`/content/${item.id}`}>
                                                Open
                                                <ArrowRight data-icon="inline-end" />
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </>
    );
}
