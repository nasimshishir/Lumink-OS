import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    CalendarDays,
    Camera,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Download,
    ExternalLink,
    Film,
    Filter,
    Layers,
    List,
    RefreshCw,
    Rss,
    Search,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { StatusBadge } from '@/components/status-badge';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import { dateTime, humanize, shortDate } from '@/lib/format';

export interface CalendarEvent {
    id: string;
    raw_id: number;
    title: string;
    event_type: 'task' | 'content' | 'shoot';
    date: string;
    start_date?: string | null;
    end_date?: string | null;
    status: string;
    priority?: string;
    sub_type: string;
    business?: { id: number; name: string } | null;
    owner?: { id: number; name: string; avatar?: string | null } | null;
    location?: string | null;
    description?: string | null;
    url?: string;
}

export interface BusinessItem {
    id: number;
    name: string;
}

export interface TeamMember {
    id: number;
    name: string;
    avatar?: string | null;
}

interface CalendarProps {
    events: CalendarEvent[];
    businesses: BusinessItem[];
    teamMembers: TeamMember[];
    calendarFeedUrl: string;
    webcalFeedUrl: string;
    calendarToken: string;
    isManager: boolean;
}

type ViewMode = 'month' | 'week' | 'agenda';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar({
    events = [],
    businesses = [],
    teamMembers = [],
    calendarFeedUrl,
    webcalFeedUrl,
    isManager,
}: CalendarProps) {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedMember, setSelectedMember] = useState<string>('all');

    // Dialog states
    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<{
        date: Date;
        events: CalendarEvent[];
    } | null>(null);
    const [syncModalOpen, setSyncModalOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Clipboard
    const [copiedFeed, copyFeed] = useClipboard();
    const [copiedWebcal, copyWebcal] = useClipboard();

    // Filtered events memo
    const filteredEvents = useMemo(() => {
        return events.filter((ev) => {
            // Search text
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const matchTitle = ev.title.toLowerCase().includes(query);
                const matchBusiness =
                    ev.business?.name.toLowerCase().includes(query) ?? false;
                const matchDesc =
                    ev.description?.toLowerCase().includes(query) ?? false;

                if (!matchTitle && !matchBusiness && !matchDesc) {
                    return false;
                }
            }

            // Business filter
            if (
                selectedBusiness !== 'all' &&
                String(ev.business?.id) !== selectedBusiness
            ) {
                return false;
            }

            // Event type filter
            if (selectedType !== 'all' && ev.event_type !== selectedType) {
                return false;
            }

            // Status filter
            if (selectedStatus === 'pending') {
                if (
                    ev.status === 'completed' ||
                    ev.status === 'published' ||
                    ev.status === 'cancelled'
                ) {
                    return false;
                }
            } else if (selectedStatus === 'completed') {
                if (ev.status !== 'completed' && ev.status !== 'published') {
                    return false;
                }
            }

            // Team member filter
            if (
                selectedMember !== 'all' &&
                String(ev.owner?.id) !== selectedMember
            ) {
                return false;
            }

            return true;
        });
    }, [
        events,
        searchQuery,
        selectedBusiness,
        selectedType,
        selectedStatus,
        selectedMember,
    ]);

    // Map events by 'YYYY-MM-DD' for high-performance lookup
    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();

        for (const ev of filteredEvents) {
            if (!ev.date) {
                continue;
            }

            const dateKey = ev.date.slice(0, 10);
            const list = map.get(dateKey) ?? [];
            list.push(ev);
            map.set(dateKey, list);
        }

        return map;
    }, [filteredEvents]);

    // Has active filters
    const hasActiveFilters =
        searchQuery !== '' ||
        selectedBusiness !== 'all' ||
        selectedType !== 'all' ||
        selectedStatus !== 'all' ||
        selectedMember !== 'all';

    function resetFilters() {
        setSearchQuery('');
        setSelectedBusiness('all');
        setSelectedType('all');
        setSelectedStatus('all');
        setSelectedMember('all');
    }

    // Date Navigation helpers
    function goToToday() {
        setCurrentDate(new Date());
    }

    function goToPrev() {
        const d = new Date(currentDate);

        if (viewMode === 'month') {
            d.setMonth(d.getMonth() - 1);
        } else if (viewMode === 'week') {
            d.setDate(d.getDate() - 7);
        } else {
            d.setMonth(d.getMonth() - 1);
        }

        setCurrentDate(d);
    }

    function goToNext() {
        const d = new Date(currentDate);

        if (viewMode === 'month') {
            d.setMonth(d.getMonth() + 1);
        } else if (viewMode === 'week') {
            d.setDate(d.getDate() + 7);
        } else {
            d.setMonth(d.getMonth() + 1);
        }

        setCurrentDate(d);
    }

    // Title for header based on current view and date
    const headerTitle = useMemo(() => {
        if (viewMode === 'month') {
            return currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
            });
        }

        if (viewMode === 'week') {
            const dayOfWeek = currentDate.getDay();
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - dayOfWeek);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            const startStr = start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
            const endStr = end.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });

            return `${startStr} – ${endStr}`;
        }

        return 'Upcoming Schedule Agenda';
    }, [currentDate, viewMode]);

    // Month days generation
    const monthCalendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sun

        const gridStart = new Date(year, month, 1 - startDayIndex);
        const gridDays: Array<{
            date: Date;
            isCurrentMonth: boolean;
            isToday: boolean;
            dateKey: string;
            events: CalendarEvent[];
        }> = [];

        const todayKey = new Date().toISOString().slice(0, 10);
        const curr = new Date(gridStart);

        for (let i = 0; i < 42; i++) {
            const dateKey = curr.toISOString().slice(0, 10);
            gridDays.push({
                date: new Date(curr),
                isCurrentMonth: curr.getMonth() === month,
                isToday: dateKey === todayKey,
                dateKey,
                events: eventsByDate.get(dateKey) ?? [],
            });
            curr.setDate(curr.getDate() + 1);
        }

        // If the 6th row (index 35..41) is completely outside the month, slice to 35
        const lastRowOutside = gridDays
            .slice(35)
            .every((d) => !d.isCurrentMonth);

        return lastRowOutside ? gridDays.slice(0, 35) : gridDays;
    }, [currentDate, eventsByDate]);

    // Week days generation
    const weekCalendarDays = useMemo(() => {
        const dayOfWeek = currentDate.getDay();
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);

        const days: Array<{
            date: Date;
            isToday: boolean;
            dateKey: string;
            events: CalendarEvent[];
        }> = [];

        const todayKey = new Date().toISOString().slice(0, 10);
        const curr = new Date(start);

        for (let i = 0; i < 7; i++) {
            const dateKey = curr.toISOString().slice(0, 10);
            days.push({
                date: new Date(curr),
                isToday: dateKey === todayKey,
                dateKey,
                events: eventsByDate.get(dateKey) ?? [],
            });
            curr.setDate(curr.getDate() + 1);
        }

        return days;
    }, [currentDate, eventsByDate]);

    // Agenda grouped list
    const agendaGroups = useMemo(() => {
        const sortedEntries = Array.from(eventsByDate.entries()).sort(
            ([a], [b]) => a.localeCompare(b),
        );

        return sortedEntries;
    }, [eventsByDate]);

    // Token regeneration
    function handleRegenerateToken() {
        if (
            !confirm(
                'Are you sure you want to regenerate your calendar subscription URL? Any calendars subscribed with the old URL will stop syncing.',
            )
        ) {
            return;
        }

        setIsRegenerating(true);
        router.post(
            '/calendar/regenerate-token',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Calendar subscription URL regenerated.');
                },
                onFinish: () => setIsRegenerating(false),
            },
        );
    }

    return (
        <>
            <Head title="Calendar" />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                {/* Top Heading & Action Bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <PageHeading
                        title="Calendar"
                        description="Internal source of truth for shoots, deadlines, approvals, and publishing."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSyncModalOpen(true)}
                            className="h-9 gap-1.5"
                        >
                            <Rss className="size-4 text-primary" />
                            <span>Subscribe & Sync</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-9 gap-1.5"
                        >
                            <a href="/calendar/export">
                                <Download className="size-4 text-muted-foreground" />
                                <span>Export .ics</span>
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Unified Toolbar: Date Navigation + View Switcher */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                            className="h-8 text-xs font-medium"
                        >
                            Today
                        </Button>
                        <div className="flex items-center rounded-lg border bg-muted/20 p-0.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToPrev}
                                className="size-7"
                                title="Previous"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToNext}
                                className="size-7"
                                title="Next"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                        <h2 className="ml-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
                            {headerTitle}
                        </h2>
                    </div>

                    {/* View Switcher: Month / Week / Agenda */}
                    <div className="flex items-center self-start rounded-lg border bg-muted/30 p-1 sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setViewMode('month')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                viewMode === 'month'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <CalendarDays className="size-3.5" />
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('week')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                viewMode === 'week'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Layers className="size-3.5" />
                            Week
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('agenda')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                viewMode === 'agenda'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <List className="size-3.5" />
                            Agenda
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid gap-2.5 rounded-xl border bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-5">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search title, client, notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>

                    {/* Business Filter */}
                    <Select
                        value={selectedBusiness}
                        onValueChange={setSelectedBusiness}
                    >
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="All Businesses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Businesses</SelectItem>
                            {businesses.map((b) => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Event Type Filter */}
                    <Select
                        value={selectedType}
                        onValueChange={setSelectedType}
                    >
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="All Event Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="task">
                                📋 Tasks & Deadlines
                            </SelectItem>
                            <SelectItem value="content">
                                🎬 Content & Publishing
                            </SelectItem>
                            <SelectItem value="shoot">
                                🎥 Video Shoots
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                    >
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">
                                Pending & Scheduled
                            </SelectItem>
                            <SelectItem value="completed">
                                Completed & Published
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Assignee Filter for Managers or Reset Button */}
                    <div className="flex items-center gap-2">
                        {isManager && teamMembers.length > 0 ? (
                            <Select
                                value={selectedMember}
                                onValueChange={setSelectedMember}
                            >
                                <SelectTrigger className="h-9 flex-1 text-xs">
                                    <SelectValue placeholder="All Members" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Team Members
                                    </SelectItem>
                                    {teamMembers.map((m) => (
                                        <SelectItem
                                            key={m.id}
                                            value={String(m.id)}
                                        >
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null}

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter info badge if filtered */}
                {hasActiveFilters && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Filter className="size-3.5" />
                            <span>
                                Showing {filteredEvents.length} of{' '}
                                {events.length} scheduled events
                            </span>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* 1. MONTH VIEW GRID                                        */}
                {/* ========================================================= */}
                {viewMode === 'month' && (
                    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                        {/* Day names header */}
                        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
                            {WEEKDAYS.map((day) => (
                                <div key={day} className="py-2.5">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Month Cells Grid */}
                        <div className="grid grid-cols-7 divide-x divide-y border-b text-xs">
                            {monthCalendarGrid.map((dayCell, idx) => {
                                const maxVisible = 3;
                                const visibleEvents = dayCell.events.slice(
                                    0,
                                    maxVisible,
                                );
                                const overflowCount =
                                    dayCell.events.length - maxVisible;

                                return (
                                    <div
                                        key={`day-${dayCell.dateKey}-${idx}`}
                                        className={`flex min-h-[110px] flex-col p-1.5 transition-colors sm:min-h-[125px] sm:p-2 ${
                                            dayCell.isCurrentMonth
                                                ? 'bg-card'
                                                : 'bg-muted/15 text-muted-foreground/60'
                                        } ${dayCell.isToday ? 'bg-primary/5' : ''}`}
                                    >
                                        {/* Day header: Number and indicator */}
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                    dayCell.isToday
                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                        : dayCell.isCurrentMonth
                                                          ? 'text-foreground'
                                                          : 'text-muted-foreground'
                                                }`}
                                            >
                                                {dayCell.date.getDate()}
                                            </span>
                                            {dayCell.events.length > 0 && (
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {dayCell.events.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Events list */}
                                        <div className="mt-1.5 flex flex-1 flex-col gap-1 overflow-hidden">
                                            {visibleEvents.map((ev) => (
                                                <button
                                                    key={ev.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveEvent(ev)
                                                    }
                                                    className={`group flex w-full items-center gap-1 truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium transition-all ${getEventBadgeClass(
                                                        ev,
                                                    )}`}
                                                    title={`${ev.title} (${ev.business?.name ?? 'Agency'})`}
                                                >
                                                    {getEventIcon(
                                                        ev.event_type,
                                                    )}
                                                    <span className="truncate">
                                                        {ev.title}
                                                    </span>
                                                </button>
                                            ))}

                                            {overflowCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedDayEvents({
                                                            date: dayCell.date,
                                                            events: dayCell.events,
                                                        })
                                                    }
                                                    className="mt-auto inline-flex items-center text-[10px] font-semibold text-primary hover:underline"
                                                >
                                                    +{overflowCount} more
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* 2. WEEK VIEW GRID                                         */}
                {/* ========================================================= */}
                {viewMode === 'week' && (
                    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
                        <div className="grid min-w-[750px] grid-cols-7 divide-x">
                            {weekCalendarDays.map((col) => (
                                <div
                                    key={col.dateKey}
                                    className={`flex min-h-[450px] flex-col ${
                                        col.isToday ? 'bg-primary/5' : ''
                                    }`}
                                >
                                    {/* Column Header */}
                                    <div
                                        className={`border-b p-3 text-center ${
                                            col.isToday
                                                ? 'border-primary/20 bg-primary/10'
                                                : 'bg-muted/30'
                                        }`}
                                    >
                                        <p className="text-xs font-medium text-muted-foreground uppercase">
                                            {WEEKDAYS[col.date.getDay()]}
                                        </p>
                                        <div
                                            className={`mx-auto mt-1 flex size-7 items-center justify-center rounded-full text-sm font-bold ${
                                                col.isToday
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-foreground'
                                            }`}
                                        >
                                            {col.date.getDate()}
                                        </div>
                                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                                            {col.events.length}{' '}
                                            {col.events.length === 1
                                                ? 'item'
                                                : 'items'}
                                        </p>
                                    </div>

                                    {/* Events Container */}
                                    <div className="flex flex-1 flex-col gap-2 p-2">
                                        {col.events.length === 0 ? (
                                            <div className="flex flex-1 items-center justify-center p-3 text-center text-xs text-muted-foreground/40">
                                                No events
                                            </div>
                                        ) : (
                                            col.events.map((ev) => (
                                                <button
                                                    key={ev.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveEvent(ev)
                                                    }
                                                    className={`flex flex-col gap-1.5 rounded-lg border p-2.5 text-left text-xs transition-shadow hover:shadow-xs ${getEventCardClass(
                                                        ev,
                                                    )}`}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                                                            {getEventIcon(
                                                                ev.event_type,
                                                            )}
                                                            {ev.event_type}
                                                        </span>
                                                        <StatusBadge
                                                            value={ev.status}
                                                        />
                                                    </div>

                                                    <p className="line-clamp-2 font-medium text-foreground">
                                                        {ev.title}
                                                    </p>

                                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                        <span>
                                                            {ev.business
                                                                ?.name ??
                                                                'Agency'}
                                                        </span>
                                                        <span className="font-mono">
                                                            {ev.date
                                                                ? new Date(
                                                                      ev.date,
                                                                  ).toLocaleTimeString(
                                                                      'en-BD',
                                                                      {
                                                                          hour: 'numeric',
                                                                          minute: '2-digit',
                                                                      },
                                                                  )
                                                                : ''}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* 3. AGENDA / LIST VIEW                                     */}
                {/* ========================================================= */}
                {viewMode === 'agenda' && (
                    <div className="flex flex-col gap-5">
                        {agendaGroups.length === 0 ? (
                            <div className="lumink-panel flex flex-col items-center justify-center p-12 text-center">
                                <CalendarIcon className="size-10 text-muted-foreground/50" />
                                <h3 className="mt-3 text-base font-semibold">
                                    No scheduled events found
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {hasActiveFilters
                                        ? 'Try adjusting or clearing your filters to see more events.'
                                        : 'There are no upcoming tasks, content deliverables, or shoots scheduled.'}
                                </p>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="mt-4"
                                    >
                                        Reset Filters
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-5 lg:grid-cols-2">
                                {agendaGroups.map(([dateKey, dayEvents]) => (
                                    <section
                                        key={dateKey}
                                        className="lumink-panel overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between border-b px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="size-4 text-primary" />
                                                <h3 className="text-sm font-semibold">
                                                    {shortDate(dateKey)}
                                                </h3>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="text-[11px]"
                                            >
                                                {dayEvents.length}{' '}
                                                {dayEvents.length === 1
                                                    ? 'event'
                                                    : 'events'}
                                            </Badge>
                                        </div>

                                        <div className="divide-y">
                                            {dayEvents.map((ev) => (
                                                <div
                                                    key={ev.id}
                                                    onClick={() =>
                                                        setActiveEvent(ev)
                                                    }
                                                    className="flex cursor-pointer items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/10"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] font-semibold uppercase ${getEventTypeColor(
                                                                    ev.event_type,
                                                                )}`}
                                                            >
                                                                {getEventIcon(
                                                                    ev.event_type,
                                                                )}
                                                                {ev.event_type}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {humanize(
                                                                    ev.sub_type,
                                                                )}
                                                            </span>
                                                        </div>

                                                        <p className="mt-1.5 text-sm font-medium text-foreground">
                                                            {ev.title}
                                                        </p>

                                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Clock className="size-3" />
                                                                {dateTime(
                                                                    ev.date,
                                                                )}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="font-medium text-foreground/80">
                                                                {ev.business
                                                                    ?.name ??
                                                                    'Agency'}
                                                            </span>
                                                            {ev.owner && (
                                                                <>
                                                                    <span>
                                                                        •
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <UserIcon className="size-3" />
                                                                        {
                                                                            ev
                                                                                .owner
                                                                                .name
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 pt-1">
                                                        <StatusBadge
                                                            value={ev.status}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* EVENT DETAIL DIALOG                                       */}
                {/* ========================================================= */}
                <Dialog
                    open={activeEvent !== null}
                    onOpenChange={(open) => !open && setActiveEvent(null)}
                >
                    <DialogContent className="max-w-md">
                        {activeEvent && (
                            <>
                                <DialogHeader>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={`text-[11px] font-bold uppercase ${getEventTypeColor(
                                                activeEvent.event_type,
                                            )}`}
                                        >
                                            {getEventIcon(
                                                activeEvent.event_type,
                                            )}
                                            {activeEvent.event_type ===
                                            'content'
                                                ? 'Content Deliverable'
                                                : activeEvent.event_type ===
                                                    'shoot'
                                                  ? 'Shoot Session'
                                                  : 'Task Deadline'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {humanize(activeEvent.sub_type)}
                                        </span>
                                    </div>
                                    <DialogTitle className="mt-2 text-lg">
                                        {activeEvent.title}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Client:{' '}
                                        {activeEvent.business?.name ??
                                            'Agency Direct'}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-2 text-xs">
                                    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                                        <div>
                                            <p className="text-muted-foreground">
                                                Status
                                            </p>
                                            <div className="mt-1">
                                                <StatusBadge
                                                    value={activeEvent.status}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Priority
                                            </p>
                                            <p className="mt-1 font-semibold text-foreground capitalize">
                                                {activeEvent.priority ??
                                                    'Normal'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Scheduled Time
                                            </p>
                                            <p className="mt-1 font-semibold text-foreground">
                                                {dateTime(activeEvent.date)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Assigned To
                                            </p>
                                            <div className="mt-1 flex items-center gap-1.5">
                                                {activeEvent.owner ? (
                                                    <>
                                                        <Avatar className="size-5">
                                                            <AvatarImage
                                                                src={
                                                                    activeEvent
                                                                        .owner
                                                                        .avatar ??
                                                                    undefined
                                                                }
                                                            />
                                                            <AvatarFallback className="text-[9px]">
                                                                {activeEvent.owner.name.slice(
                                                                    0,
                                                                    2,
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                activeEvent
                                                                    .owner.name
                                                            }
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {activeEvent.location && (
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                Location
                                            </p>
                                            <p className="mt-0.5 text-muted-foreground">
                                                {activeEvent.location}
                                            </p>
                                        </div>
                                    )}

                                    {activeEvent.description && (
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                Notes & Brief
                                            </p>
                                            <p className="mt-1 rounded-md bg-muted/20 p-2.5 whitespace-pre-wrap text-muted-foreground">
                                                {activeEvent.description}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="flex items-center justify-between sm:justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActiveEvent(null)}
                                    >
                                        Close
                                    </Button>
                                    {activeEvent.url && (
                                        <Button size="sm" asChild>
                                            <Link href={activeEvent.url}>
                                                <span>Open Record</span>
                                                <ExternalLink className="size-3.5" />
                                            </Link>
                                        </Button>
                                    )}
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ========================================================= */}
                {/* DAY OVERFLOW MODAL (When clicking +X more)                 */}
                {/* ========================================================= */}
                <Dialog
                    open={selectedDayEvents !== null}
                    onOpenChange={(open) => !open && setSelectedDayEvents(null)}
                >
                    <DialogContent className="max-w-md">
                        {selectedDayEvents && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>
                                        {shortDate(
                                            selectedDayEvents.date
                                                .toISOString()
                                                .slice(0, 10),
                                        )}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {selectedDayEvents.events.length} events
                                        scheduled on this date
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                                    {selectedDayEvents.events.map((ev) => (
                                        <div
                                            key={ev.id}
                                            onClick={() => {
                                                setSelectedDayEvents(null);
                                                setActiveEvent(ev);
                                            }}
                                            className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors hover:bg-muted/20 ${getEventCardClass(
                                                ev,
                                            )}`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                                    {getEventIcon(
                                                        ev.event_type,
                                                    )}
                                                    <span>{ev.event_type}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {ev.business?.name ??
                                                            'Agency'}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 truncate font-medium text-foreground">
                                                    {ev.title}
                                                </p>
                                            </div>
                                            <StatusBadge value={ev.status} />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ========================================================= */}
                {/* SUBSCRIBE & SYNC MODAL                                    */}
                {/* ========================================================= */}
                <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Rss className="size-4" />
                                </div>
                                <DialogTitle>
                                    Calendar Sync & Subscription
                                </DialogTitle>
                            </div>
                            <DialogDescription>
                                Sync your agency tasks, shoots, and publishing
                                deliverables directly into Google Calendar,
                                Apple Calendar, or Outlook.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            {/* Webcal Feed Subscription */}
                            <div className="space-y-2 rounded-lg border bg-muted/15 p-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">
                                        Webcal Subscription Link (Live Feed)
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                    >
                                        Auto-updates
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    External calendars will automatically
                                    refresh with newly scheduled tasks and
                                    shoots.
                                </p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={webcalFeedUrl}
                                        className="h-8 font-mono text-[11px]"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 shrink-0 gap-1 text-xs"
                                        onClick={() => {
                                            copyWebcal(webcalFeedUrl);
                                            toast.success(
                                                'Webcal link copied to clipboard!',
                                            );
                                        }}
                                    >
                                        {copiedWebcal ? (
                                            <Check className="size-3.5 text-emerald-600" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                        <span>Copy</span>
                                    </Button>
                                </div>
                            </div>

                            {/* HTTPS Feed URL */}
                            <div className="space-y-2 rounded-lg border bg-muted/15 p-3.5">
                                <span className="text-xs font-semibold text-foreground">
                                    HTTPS URL (for Google Calendar)
                                </span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={calendarFeedUrl}
                                        className="h-8 font-mono text-[11px]"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 shrink-0 gap-1 text-xs"
                                        onClick={() => {
                                            copyFeed(calendarFeedUrl);
                                            toast.success(
                                                'HTTPS feed URL copied!',
                                            );
                                        }}
                                    >
                                        {copiedFeed ? (
                                            <Check className="size-3.5 text-emerald-600" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                        <span>Copy</span>
                                    </Button>
                                </div>
                            </div>

                            {/* How to Connect Instructions */}
                            <div className="space-y-2.5 rounded-lg border p-3.5 text-xs">
                                <p className="font-semibold text-foreground">
                                    How to add to your calendar:
                                </p>
                                <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                                    <li>
                                        <strong className="text-foreground">
                                            Google Calendar:
                                        </strong>{' '}
                                        Click "+ Other calendars" → "From URL" →
                                        Paste the HTTPS link.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">
                                            Apple Calendar:
                                        </strong>{' '}
                                        Go to File → "New Calendar Subscription"
                                        → Paste the Webcal link.
                                    </li>
                                    <li>
                                        <strong className="text-foreground">
                                            Outlook:
                                        </strong>{' '}
                                        Select "Add calendar" → "Subscribe from
                                        web" → Paste the HTTPS link.
                                    </li>
                                </ol>
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isRegenerating}
                                onClick={handleRegenerateToken}
                                className="text-xs text-muted-foreground hover:text-destructive"
                            >
                                <RefreshCw
                                    className={`size-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                                />
                                <span>Reset Private Token</span>
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setSyncModalOpen(false)}
                            >
                                Done
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

// Styling helpers
function getEventBadgeClass(ev: CalendarEvent): string {
    if (ev.event_type === 'content') {
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-500/20';
    }

    if (ev.event_type === 'shoot') {
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-500/20';
    }

    return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-500/20';
}

function getEventCardClass(ev: CalendarEvent): string {
    if (ev.event_type === 'content') {
        return 'border-purple-200/80 bg-purple-500/5 hover:border-purple-400 dark:border-purple-900/50';
    }

    if (ev.event_type === 'shoot') {
        return 'border-amber-200/80 bg-amber-500/5 hover:border-amber-400 dark:border-amber-900/50';
    }

    return 'border-blue-200/80 bg-blue-500/5 hover:border-blue-400 dark:border-blue-900/50';
}

function getEventTypeColor(type: string): string {
    if (type === 'content') {
        return 'border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10';
    }

    if (type === 'shoot') {
        return 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10';
    }

    return 'border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10';
}

function getEventIcon(type: string) {
    if (type === 'content') {
        return <Film className="size-3 shrink-0" />;
    }

    if (type === 'shoot') {
        return <Camera className="size-3 shrink-0" />;
    }

    return <CheckCircle2 className="size-3 shrink-0" />;
}
