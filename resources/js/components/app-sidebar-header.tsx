import { usePage, router } from '@inertiajs/react';
import { Bell, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationData {
    title: string;
    description?: string;
    link?: string;
}

interface Notification {
    id: string;
    type: string;
    data: NotificationData;
    read_at: string | null;
    created_at: string;
}

interface PageProps {
    auth: {
        user: any;
    };
    notifications?: {
        list: Notification[];
        unread_count: number;
    };
}

export function AppSidebarHeader() {
    const { auth, notifications } = usePage().props as unknown as PageProps;
    const initials = useInitials();
    const user = auth.user;

    const formatTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
        } catch (e) {
            return '';
        }
    };

    return (
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 md:px-5">
            <SidebarTrigger />
            <div className="relative hidden w-full max-w-md md:block">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="h-9 border-border bg-background pl-9 text-sm"
                    placeholder="Search businesses, content, tasks…"
                />
            </div>
            <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Notifications"
                            className="relative"
                        >
                            <Bell className="size-5" />
                            {notifications && notifications.unread_count > 0 && (
                                <span className="absolute top-1 right-1 flex size-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                                    <span className="relative inline-flex size-2.5 rounded-full bg-destructive"></span>
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-[400px] overflow-y-auto" align="end">
                        <div className="flex items-center justify-between px-4 py-2 border-b">
                            <DropdownMenuLabel className="font-semibold p-0 text-sm">Notifications</DropdownMenuLabel>
                            {notifications && notifications.unread_count > 0 && (
                                <Button
                                    variant="link"
                                    className="h-auto p-0 text-xs text-primary font-medium hover:underline"
                                    onClick={() => router.post('/notifications/read-all')}
                                >
                                    Mark all as read
                                </Button>
                            )}
                        </div>

                        {(!notifications || notifications.list.length === 0) ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No notifications
                            </div>
                        ) : (
                            <div className="py-1">
                                {notifications.list.map((notification) => {
                                    const isUnread = !notification.read_at;

                                    return (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            className={`flex flex-col items-start gap-1 p-3 cursor-pointer border-b last:border-b-0 focus:bg-accent transition-colors ${
                                                isUnread ? 'bg-primary/5 hover:bg-primary/10' : ''
                                            }`}
                                            onClick={() => router.post(`/notifications/${notification.id}/read`)}
                                        >
                                            <div className="flex items-start justify-between w-full gap-2">
                                                <span className={`text-xs font-semibold ${isUnread ? 'text-primary' : 'text-foreground'}`}>
                                                    {notification.data.title}
                                                </span>
                                                {isUnread && (
                                                    <span className="size-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground text-left leading-relaxed">
                                                {notification.data.description}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground font-light">
                                                {formatTimeAgo(notification.created_at)}
                                            </span>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden text-right sm:block">
                    <p className="text-sm leading-tight font-semibold">
                        {user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                        {String(user?.role ?? '')}
                    </p>
                </div>
                <Avatar className="size-9">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials(user?.name ?? '')}
                    </AvatarFallback>
                </Avatar>
            </div>
        </header>
    );
}
