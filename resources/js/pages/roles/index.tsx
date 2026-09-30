import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    Lock,
    Plus,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type PermissionItem = {
    name: string;
    label: string;
    description: string;
};

type RoleItem = {
    id: number;
    name: string;
    users_count: number;
    permissions: { id: number; name: string }[];
};

type UserItem = {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    is_active: boolean;
};

type Props = {
    roles: RoleItem[];
    permissionGroups: Record<string, PermissionItem[]>;
    allPermissions: string[];
    users: UserItem[];
    systemRoles: string[];
    isOwner?: boolean;
};

export default function RolesAndPermissions({
    roles = [],
    permissionGroups = {},
    allPermissions = [],
    users = [],
    systemRoles = ['owner', 'manager', 'specialist'],
    isOwner = true,
}: Props) {
    const [currentView, setCurrentView] = useState<
        'roles' | 'matrix' | 'users'
    >('roles');

    // Dialog states
    const [createRoleOpen, setCreateRoleOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<RoleItem | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
    const [actionInProgress, setActionInProgress] = useState<string | null>(
        null,
    );

    // Form for creating a role
    const createForm = useForm({
        name: '',
        permissions: [] as string[],
    });

    // Form for editing role permissions
    const editForm = useForm({
        name: '',
        permissions: [] as string[],
    });

    function openEditRole(role: RoleItem) {
        setRoleToEdit(role);
        editForm.setData({
            name: role.name,
            permissions: role.permissions.map((p) => p.name),
        });
    }

    function handleCreateRole(e: FormEvent) {
        e.preventDefault();
        createForm.post('/roles', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateRoleOpen(false);
                createForm.reset();
            },
        });
    }

    function handleUpdateRole(e: FormEvent) {
        e.preventDefault();

        if (!roleToEdit) {
            return;
        }

        editForm.patch(`/roles/${roleToEdit.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setRoleToEdit(null);
            },
        });
    }

    function confirmDeleteRole() {
        if (!roleToDelete) {
            return;
        }

        setActionInProgress(`delete-${roleToDelete.id}`);
        router.delete(`/roles/${roleToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => setRoleToDelete(null),
            onFinish: () => setActionInProgress(null),
        });
    }

    function handleAssignUserRole(userId: number, newRole: string) {
        setActionInProgress(`user-${userId}`);
        router.post(
            '/roles/assign-user',
            { user_id: userId, role: newRole },
            {
                preserveScroll: true,
                onFinish: () => setActionInProgress(null),
            },
        );
    }

    function togglePermissionInCreate(permName: string) {
        const current = [...createForm.data.permissions];
        const index = current.indexOf(permName);

        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(permName);
        }

        createForm.setData('permissions', current);
    }

    function toggleGroupInCreate(groupPermissions: PermissionItem[]) {
        const groupNames = groupPermissions.map((p) => p.name);
        const allSelected = groupNames.every((name) =>
            createForm.data.permissions.includes(name),
        );

        if (allSelected) {
            createForm.setData(
                'permissions',
                createForm.data.permissions.filter(
                    (name) => !groupNames.includes(name),
                ),
            );
        } else {
            const combined = Array.from(
                new Set([...createForm.data.permissions, ...groupNames]),
            );
            createForm.setData('permissions', combined);
        }
    }

    function togglePermissionInEdit(permName: string) {
        const current = [...editForm.data.permissions];
        const index = current.indexOf(permName);

        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(permName);
        }

        editForm.setData('permissions', current);
    }

    function toggleGroupInEdit(groupPermissions: PermissionItem[]) {
        const groupNames = groupPermissions.map((p) => p.name);
        const allSelected = groupNames.every((name) =>
            editForm.data.permissions.includes(name),
        );

        if (allSelected) {
            editForm.setData(
                'permissions',
                editForm.data.permissions.filter(
                    (name) => !groupNames.includes(name),
                ),
            );
        } else {
            const combined = Array.from(
                new Set([...editForm.data.permissions, ...groupNames]),
            );
            editForm.setData('permissions', combined);
        }
    }

    return (
        <>
            <Head title="Roles & Permissions" />
            <PageHeading
                title="Roles & Permissions"
                description="Manage user access levels, configure granular permissions, and govern administrative control."
                actions={
                    isOwner ? (
                        <Button onClick={() => setCreateRoleOpen(true)}>
                            <Plus data-icon="inline-start" />
                            Create Role
                        </Button>
                    ) : undefined
                }
            />

            <main className="flex flex-col gap-6 p-5">
                {/* View switcher tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="inline-flex rounded-lg border bg-muted p-1 text-sm font-medium">
                        <button
                            type="button"
                            onClick={() => setCurrentView('roles')}
                            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 transition-colors ${
                                currentView === 'roles'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Shield className="size-4" />
                            Roles ({roles.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentView('matrix')}
                            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 transition-colors ${
                                currentView === 'matrix'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ShieldCheck className="size-4" />
                            Permissions Matrix
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentView('users')}
                            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 transition-colors ${
                                currentView === 'users'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Users className="size-4" />
                            User Assignments ({users.length})
                        </button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Total Permissions:{' '}
                        <span className="font-semibold text-foreground">
                            {allPermissions.length}
                        </span>
                    </p>
                </div>

                {/* View 1: Roles Overview Cards */}
                {currentView === 'roles' && (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {roles.map((role) => {
                            const isSystem = systemRoles.includes(role.name);
                            const isOwnerRole = role.name === 'owner';

                            return (
                                <div
                                    key={role.id}
                                    className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm"
                                >
                                    <div>
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    {isOwnerRole ? (
                                                        <ShieldAlert className="size-5" />
                                                    ) : (
                                                        <ShieldCheck className="size-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-semibold text-foreground capitalize">
                                                        {role.name.replaceAll(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {role.users_count}{' '}
                                                        {role.users_count === 1
                                                            ? 'member'
                                                            : 'members'}
                                                    </p>
                                                </div>
                                            </div>
                                            {isSystem ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-primary/20 text-[10px] text-primary"
                                                >
                                                    System Role
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    Custom Role
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="mb-4 text-xs text-muted-foreground">
                                            {isOwnerRole
                                                ? 'Full unconstrained system authority over all operations, users, settings, and finances.'
                                                : role.name === 'manager'
                                                  ? 'Operational oversight over businesses, content delivery pipeline, tasks, and reports.'
                                                  : role.name === 'specialist'
                                                    ? 'Assigned content creation, scripting, and task execution workflows.'
                                                    : `Custom configured permission set for ${role.name.replaceAll('_', ' ')}.`}
                                        </p>

                                        <div className="border-t pt-3">
                                            <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                                                Permissions (
                                                {isOwnerRole
                                                    ? 'All'
                                                    : role.permissions
                                                          .length}{' '}
                                                of {allPermissions.length}):
                                            </p>
                                            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                                                {isOwnerRole ? (
                                                    <Badge
                                                        variant="default"
                                                        className="text-[10px]"
                                                    >
                                                        All System Capabilities
                                                        Granted
                                                    </Badge>
                                                ) : role.permissions.length ===
                                                  0 ? (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        No permissions assigned
                                                    </span>
                                                ) : (
                                                    role.permissions
                                                        .slice(0, 8)
                                                        .map((p) => (
                                                            <Badge
                                                                key={p.name}
                                                                variant="secondary"
                                                                className="text-[10px] font-normal"
                                                            >
                                                                {p.name}
                                                            </Badge>
                                                        ))
                                                )}
                                                {!isOwnerRole &&
                                                    role.permissions.length >
                                                        8 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            +
                                                            {role.permissions
                                                                .length -
                                                                8}{' '}
                                                            more
                                                        </Badge>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-2 border-t pt-3">
                                        {isOwner ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() =>
                                                    openEditRole(role)
                                                }
                                            >
                                                {isOwnerRole
                                                    ? 'View Permissions'
                                                    : 'Configure Permissions'}
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                Configured by Owner
                                            </span>
                                        )}

                                        {!isSystem && isOwner && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                title="Delete Custom Role"
                                                onClick={() =>
                                                    setRoleToDelete(role)
                                                }
                                                disabled={role.users_count > 0}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* View 2: Permissions Matrix */}
                {currentView === 'matrix' && (
                    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                                <tr>
                                    <th className="min-w-[280px] px-5 py-3.5">
                                        Permission
                                    </th>
                                    {roles.map((r) => (
                                        <th
                                            key={r.id}
                                            className="min-w-[120px] px-4 py-3.5 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="capitalize">
                                                    {r.name.replaceAll(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </span>
                                                <span className="text-[10px] font-normal text-muted-foreground lowercase">
                                                    (
                                                    {r.name === 'owner'
                                                        ? allPermissions.length
                                                        : r.permissions.length}
                                                    )
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Object.entries(permissionGroups).map(
                                    ([groupTitle, perms]) => (
                                        <>
                                            <tr
                                                key={`group-${groupTitle}`}
                                                className="bg-muted/20"
                                            >
                                                <td
                                                    colSpan={roles.length + 1}
                                                    className="px-5 py-2.5 text-xs font-bold tracking-wider text-foreground uppercase"
                                                >
                                                    {groupTitle}
                                                </td>
                                            </tr>
                                            {perms.map((perm) => (
                                                <tr
                                                    key={perm.name}
                                                    className="transition-colors hover:bg-muted/10"
                                                >
                                                    <td className="px-5 py-3">
                                                        <p className="text-xs font-medium text-foreground sm:text-sm">
                                                            {perm.label}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {perm.description}
                                                        </p>
                                                    </td>
                                                    {roles.map((role) => {
                                                        const hasPerm =
                                                            role.name ===
                                                                'owner' ||
                                                            role.permissions.some(
                                                                (p) =>
                                                                    p.name ===
                                                                    perm.name,
                                                            );

                                                        return (
                                                            <td
                                                                key={`${role.id}-${perm.name}`}
                                                                className="px-4 py-3 text-center"
                                                            >
                                                                {hasPerm ? (
                                                                    <div className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                                                                        <Check className="size-3.5 stroke-[2.5]" />
                                                                    </div>
                                                                ) : (
                                                                    <span className="font-semibold text-muted-foreground/30">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* View 3: User Role Assignments */}
                {currentView === 'users' && (
                    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                        <div className="grid grid-cols-12 items-center gap-3 border-b bg-muted/30 px-5 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            <div className="col-span-12 sm:col-span-5">
                                User
                            </div>
                            <div className="hidden sm:col-span-3 sm:block">
                                Status
                            </div>
                            <div className="col-span-12 text-right sm:col-span-4 sm:text-left">
                                Assigned Role
                            </div>
                        </div>
                        <div className="divide-y">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/15"
                                >
                                    <div className="col-span-12 sm:col-span-5">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-9">
                                                <AvatarImage
                                                    src={user.avatar}
                                                />
                                                <AvatarFallback className="text-xs font-semibold">
                                                    {user.name
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {user.name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:col-span-3 sm:block">
                                        <Badge
                                            variant={
                                                user.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className="text-xs capitalize"
                                        >
                                            {user.is_active
                                                ? 'Active'
                                                : 'Disabled'}
                                        </Badge>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4">
                                        {isOwner ? (
                                            <Select
                                                value={user.role}
                                                onValueChange={(newRole) =>
                                                    handleAssignUserRole(
                                                        user.id,
                                                        newRole,
                                                    )
                                                }
                                                disabled={
                                                    actionInProgress ===
                                                    `user-${user.id}`
                                                }
                                            >
                                                <SelectTrigger className="h-8 w-full text-xs capitalize sm:w-48">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((r) => (
                                                        <SelectItem
                                                            key={r.id}
                                                            value={r.name}
                                                            className="text-xs capitalize"
                                                        >
                                                            {r.name.replaceAll(
                                                                '_',
                                                                ' ',
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-xs capitalize"
                                            >
                                                {user.role.replaceAll('_', ' ')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Role Dialog */}
            <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
                <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
                    <DialogHeader>
                        <DialogTitle>Create Custom Role</DialogTitle>
                        <DialogDescription>
                            Define a new access role and configure its specific
                            capability permissions.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateRole}
                        className="flex flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <div className="shrink-0 space-y-1.5">
                            <Label htmlFor="role-name">
                                Role Name (Identifier)
                            </Label>
                            <Input
                                id="role-name"
                                placeholder="e.g. video_editor, client_manager"
                                required
                                value={createForm.data.name}
                                onChange={(e) =>
                                    createForm.setData('name', e.target.value)
                                }
                            />
                            {createForm.errors.name && (
                                <p className="text-xs text-destructive">
                                    {createForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto rounded-lg border bg-muted/10 p-4 pr-2">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="text-sm font-semibold">
                                    Assign Permissions
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    {createForm.data.permissions.length} of{' '}
                                    {allPermissions.length} selected
                                </span>
                            </div>

                            {Object.entries(permissionGroups).map(
                                ([groupTitle, perms]) => {
                                    const groupNames = perms.map((p) => p.name);
                                    const allSelected = groupNames.every((n) =>
                                        createForm.data.permissions.includes(n),
                                    );

                                    return (
                                        <div
                                            key={`create-group-${groupTitle}`}
                                            className="space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between border-b pb-1.5">
                                                <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                                                    {groupTitle}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px]"
                                                    onClick={() =>
                                                        toggleGroupInCreate(
                                                            perms,
                                                        )
                                                    }
                                                >
                                                    {allSelected
                                                        ? 'Deselect Group'
                                                        : 'Select Group'}
                                                </Button>
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {perms.map((p) => {
                                                    const checked =
                                                        createForm.data.permissions.includes(
                                                            p.name,
                                                        );

                                                    return (
                                                        <label
                                                            key={`create-perm-${p.name}`}
                                                            className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2 text-xs transition-colors ${
                                                                checked
                                                                    ? 'border-primary/50 bg-primary/5'
                                                                    : 'border-border/60 hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Checkbox
                                                                checked={
                                                                    checked
                                                                }
                                                                onCheckedChange={() =>
                                                                    togglePermissionInCreate(
                                                                        p.name,
                                                                    )
                                                                }
                                                                className="mt-0.5"
                                                            />
                                                            <div>
                                                                <p className="font-medium text-foreground">
                                                                    {p.label}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {
                                                                        p.description
                                                                    }
                                                                </p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>

                        <DialogFooter className="shrink-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateRoleOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Create Role
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role Permissions Dialog */}
            <Dialog
                open={roleToEdit !== null}
                onOpenChange={(open) => !open && setRoleToEdit(null)}
            >
                <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
                    <DialogHeader>
                        <DialogTitle className="capitalize">
                            Configure {roleToEdit?.name.replaceAll('_', ' ')}{' '}
                            Permissions
                        </DialogTitle>
                        <DialogDescription>
                            {roleToEdit?.name === 'owner'
                                ? 'The Owner role holds universal administrative authority across all modules.'
                                : 'Update the granular access permissions granted to users with this role.'}
                        </DialogDescription>
                    </DialogHeader>

                    {roleToEdit?.name === 'owner' ? (
                        <div className="space-y-3 py-8 text-center">
                            <div className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Lock className="size-6" />
                            </div>
                            <h4 className="font-semibold text-foreground">
                                Super Administrator Role
                            </h4>
                            <p className="mx-auto max-w-md text-xs text-muted-foreground">
                                The <strong>owner</strong> role permanently
                                inherits all system capabilities, security
                                bypasses, financial ledgers, and workspace
                                authority.
                            </p>
                        </div>
                    ) : (
                        <form
                            onSubmit={handleUpdateRole}
                            className="flex flex-1 flex-col gap-4 overflow-hidden"
                        >
                            {!systemRoles.includes(roleToEdit?.name ?? '') && (
                                <div className="shrink-0 space-y-1.5">
                                    <Label htmlFor="edit-role-name">
                                        Role Name
                                    </Label>
                                    <Input
                                        id="edit-role-name"
                                        required
                                        value={editForm.data.name}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'name',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            )}

                            <div className="flex-1 space-y-5 overflow-y-auto rounded-lg border bg-muted/10 p-4 pr-2">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-sm font-semibold">
                                        Active Permissions
                                    </h4>
                                    <span className="text-xs text-muted-foreground">
                                        {editForm.data.permissions.length} of{' '}
                                        {allPermissions.length} selected
                                    </span>
                                </div>

                                {Object.entries(permissionGroups).map(
                                    ([groupTitle, perms]) => {
                                        const groupNames = perms.map(
                                            (p) => p.name,
                                        );
                                        const allSelected = groupNames.every(
                                            (n) =>
                                                editForm.data.permissions.includes(
                                                    n,
                                                ),
                                        );

                                        return (
                                            <div
                                                key={`edit-group-${groupTitle}`}
                                                className="space-y-2.5"
                                            >
                                                <div className="flex items-center justify-between border-b pb-1.5">
                                                    <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                                                        {groupTitle}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px]"
                                                        onClick={() =>
                                                            toggleGroupInEdit(
                                                                perms,
                                                            )
                                                        }
                                                    >
                                                        {allSelected
                                                            ? 'Deselect Group'
                                                            : 'Select Group'}
                                                    </Button>
                                                </div>

                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {perms.map((p) => {
                                                        const checked =
                                                            editForm.data.permissions.includes(
                                                                p.name,
                                                            );

                                                        return (
                                                            <label
                                                                key={`edit-perm-${p.name}`}
                                                                className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2 text-xs transition-colors ${
                                                                    checked
                                                                        ? 'border-primary/50 bg-primary/5'
                                                                        : 'border-border/60 hover:bg-muted/40'
                                                                }`}
                                                            >
                                                                <Checkbox
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onCheckedChange={() =>
                                                                        togglePermissionInEdit(
                                                                            p.name,
                                                                        )
                                                                    }
                                                                    className="mt-0.5"
                                                                />
                                                                <div>
                                                                    <p className="font-medium text-foreground">
                                                                        {
                                                                            p.label
                                                                        }
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {
                                                                            p.description
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>

                            <DialogFooter className="shrink-0 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRoleToEdit(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                >
                                    Save Permissions
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Custom Role Confirmation Dialog */}
            <Dialog
                open={roleToDelete !== null}
                onOpenChange={(open) => !open && setRoleToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                            <AlertTriangle className="size-5" />
                        </div>
                        <DialogTitle>
                            Delete role '{roleToDelete?.name}'?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this custom role?
                            This will remove its definition from the system.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRoleToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeleteRole}
                            disabled={actionInProgress !== null}
                        >
                            Delete Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
