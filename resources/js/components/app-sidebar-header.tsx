import { usePage } from '@inertiajs/react';
import { Bell, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
export function AppSidebarHeader() {
    const { auth } = usePage().props;
    const initials = useInitials();
    const user = auth.user;

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
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    className="relative"
                >
                    <Bell />
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
                </Button>
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
