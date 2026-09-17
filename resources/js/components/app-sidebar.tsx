import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    BriefcaseBusiness,
    CalendarDays,
    CircleDollarSign,
    ClipboardCheck,
    LayoutDashboard,
    Settings,
    Users,
    Video,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const allNavItems: (NavItem & {
    ownerOnly?: boolean;
    operationsOnly?: boolean;
})[] = [
    { title: 'Today', href: '/today', icon: LayoutDashboard },
    { title: 'My Work', href: '/my-work', icon: ClipboardCheck },
    {
        title: 'Businesses',
        href: '/businesses',
        icon: BriefcaseBusiness,
        operationsOnly: true,
    },
    { title: 'Content', href: '/content', icon: Video },
    { title: 'Calendar', href: '/calendar', icon: CalendarDays },
    {
        title: 'Finance',
        href: '/finance',
        icon: CircleDollarSign,
        ownerOnly: true,
    },
    { title: 'Reports', href: '/reports', icon: BarChart3, ownerOnly: true },
    { title: 'Team', href: '/team', icon: Users, ownerOnly: true },
    { title: 'Settings', href: '/settings/profile', icon: Settings },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const role = auth.user?.role as string | undefined;
    const navItems = allNavItems.filter(
        (item) =>
            (!item.ownerOnly || role === 'owner') &&
            (!item.operationsOnly || role === 'owner' || role === 'manager'),
    );

    return (
        <Sidebar collapsible="icon" className="border-r-0">
            <SidebarHeader className="px-3 py-5">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-14 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                            <Link href="/today" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="pt-4">
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border/70 p-3">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
