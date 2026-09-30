<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    public const SYSTEM_ROLES = ['owner', 'manager', 'specialist'];

    public const PERMISSION_GROUPS = [
        'Businesses' => [
            ['name' => 'businesses.view', 'label' => 'View Businesses', 'description' => 'View client workspaces, health and overview'],
            ['name' => 'businesses.create', 'label' => 'Create Businesses', 'description' => 'Create new client workspaces and contracts'],
            ['name' => 'businesses.edit', 'label' => 'Edit Businesses', 'description' => 'Modify business settings, profile, and retainers'],
            ['name' => 'businesses.delete', 'label' => 'Delete Businesses', 'description' => 'Move business workspaces to the Recycle Bin'],
            ['name' => 'businesses.restore', 'label' => 'Restore Businesses', 'description' => 'Restore deleted businesses from Recycle Bin'],
        ],
        'Tasks' => [
            ['name' => 'tasks.view', 'label' => 'View Tasks', 'description' => 'View tasks across the workspace'],
            ['name' => 'tasks.create', 'label' => 'Create Tasks', 'description' => 'Create and assign new tasks'],
            ['name' => 'tasks.edit', 'label' => 'Edit Tasks', 'description' => 'Update task status, priority, and assignments'],
            ['name' => 'tasks.delete', 'label' => 'Delete Tasks', 'description' => 'Move tasks to the Recycle Bin'],
            ['name' => 'tasks.restore', 'label' => 'Restore Tasks', 'description' => 'Restore deleted tasks from Recycle Bin'],
        ],
        'Content' => [
            ['name' => 'content.view', 'label' => 'View Content', 'description' => 'View pipeline content items and stages'],
            ['name' => 'content.create', 'label' => 'Create Content', 'description' => 'Create new content deliverables and briefs'],
            ['name' => 'content.edit', 'label' => 'Edit Content', 'description' => 'Update scripts, hooks, briefs, and stages'],
            ['name' => 'content.delete', 'label' => 'Delete Content', 'description' => 'Move content items to the Recycle Bin'],
            ['name' => 'content.restore', 'label' => 'Restore Content', 'description' => 'Restore deleted content from Recycle Bin'],
        ],
        'Finance' => [
            ['name' => 'finance.view', 'label' => 'View Finance', 'description' => 'View cashflow, retainers, and financial dashboards'],
            ['name' => 'invoices.manage', 'label' => 'Manage Invoices', 'description' => 'Create and send invoices, record payments'],
            ['name' => 'invoices.delete', 'label' => 'Delete Invoices', 'description' => 'Move invoices to the Recycle Bin'],
            ['name' => 'expenses.manage', 'label' => 'Manage Expenses', 'description' => 'Record direct and overhead agency expenses'],
            ['name' => 'expenses.delete', 'label' => 'Delete Expenses', 'description' => 'Move expenses to the Recycle Bin'],
            ['name' => 'finance.manage', 'label' => 'Full Finance Control', 'description' => 'Full administrative access to financial records'],
        ],
        'Reports' => [
            ['name' => 'reports.view', 'label' => 'View Reports', 'description' => 'View performance reports and analytics'],
            ['name' => 'reports.create', 'label' => 'Create Reports', 'description' => 'Generate and publish performance reports'],
        ],
        'Team' => [
            ['name' => 'team.view', 'label' => 'View Team', 'description' => 'View team members and roster'],
            ['name' => 'team.manage', 'label' => 'Manage Team', 'description' => 'Invite, suspend, and reactivate team members'],
        ],
        'Roles & Access' => [
            ['name' => 'roles.view', 'label' => 'View Roles', 'description' => 'View roles and permission matrices'],
            ['name' => 'roles.manage', 'label' => 'Manage Roles', 'description' => 'Create, edit, and assign roles and permissions'],
        ],
        'Recycle Bin' => [
            ['name' => 'recycle_bin.view', 'label' => 'View Recycle Bin', 'description' => 'Access the centralized Recycle Bin'],
            ['name' => 'recycle_bin.restore', 'label' => 'Restore Items', 'description' => 'Restore deleted records from Recycle Bin'],
            ['name' => 'recycle_bin.force_delete', 'label' => 'Permanently Delete', 'description' => 'Permanently destroy records from database'],
            ['name' => 'recycle_bin.empty', 'label' => 'Empty Recycle Bin', 'description' => 'Purge all trashed items in bulk'],
        ],
    ];

    public function index(Request $request): Response
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('roles.view'),
            403
        );

        $roles = Role::with('permissions')
            ->withCount('users')
            ->orderBy('name')
            ->get();

        $users = User::select('id', 'name', 'email', 'avatar', 'role', 'is_active')
            ->with('roles')
            ->orderBy('name')
            ->get();

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissionGroups' => self::PERMISSION_GROUPS,
            'allPermissions' => Permission::orderBy('name')->pluck('name'),
            'users' => $users,
            'systemRoles' => self::SYSTEM_ROLES,
            'isOwner' => $request->user()->isOwner(),
        ]);
    }

    protected function normalizeRoleName(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $cleaned = trim(preg_replace('/[\s\-]+/', '_', $name));

        return strtolower($cleaned);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('roles.manage'),
            403
        );

        if ($request->has('name')) {
            $request->merge(['name' => $this->normalizeRoleName((string) $request->input('name'))]);
        }

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'min:2',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                'unique:roles,name',
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ], [
            'name.required' => 'The role name is required.',
            'name.min' => 'The role name must be at least 2 characters.',
            'name.max' => 'The role name may not be greater than 50 characters.',
            'name.regex' => 'The role name may only contain letters, numbers, spaces, and underscores.',
            'name.unique' => 'A role with this name already exists.',
        ]);

        $roleName = $data['name'];
        $role = Role::create(['name' => $roleName, 'guard_name' => 'web']);

        if (! empty($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'role.created',
            'auditable_type' => Role::class,
            'auditable_id' => $role->id,
            'metadata' => [
                'name' => $roleName,
                'permissions_count' => count($data['permissions'] ?? []),
            ],
        ]);

        return back()->with('success', "Role '{$roleName}' has been created.");
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('roles.manage'),
            403
        );

        if ($request->has('name')) {
            $request->merge(['name' => $this->normalizeRoleName((string) $request->input('name'))]);
        }

        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                'unique:roles,name,'.$role->id,
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ], [
            'name.required' => 'The role name is required.',
            'name.min' => 'The role name must be at least 2 characters.',
            'name.max' => 'The role name may not be greater than 50 characters.',
            'name.regex' => 'The role name may only contain letters, numbers, spaces, and underscores.',
            'name.unique' => 'A role with this name already exists.',
        ]);

        if (isset($data['name']) && ! in_array($role->name, self::SYSTEM_ROLES, true)) {
            $oldName = $role->name;
            $role->name = $data['name'];
            $role->save();

            if ($oldName !== $role->name) {
                User::where('role', $oldName)->update(['role' => $role->name]);
            }
        }

        if ($role->name === 'owner') {
            $role->syncPermissions(Permission::all());
        } elseif (isset($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'role.updated',
            'auditable_type' => Role::class,
            'auditable_id' => $role->id,
            'metadata' => [
                'name' => $role->name,
                'permissions_count' => count($data['permissions'] ?? []),
            ],
        ]);

        return back()->with('success', "Role '{$role->name}' has been updated.");
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('roles.manage'),
            403
        );

        if (in_array($role->name, self::SYSTEM_ROLES, true)) {
            abort(422, "System role '{$role->name}' cannot be deleted.");
        }

        if ($role->users()->count() > 0) {
            abort(422, "Role '{$role->name}' is assigned to users. Reassign users before deleting.");
        }

        $name = $role->name;
        $id = $role->id;

        $role->delete();

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'role.deleted',
            'auditable_type' => Role::class,
            'auditable_id' => $id,
            'metadata' => ['name' => $name],
        ]);

        return back()->with('success', "Role '{$name}' has been removed.");
    }

    public function assignUser(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()->isOwner() || $request->user()->can('roles.manage'),
            403
        );

        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);

        $user = User::query()->whereKey($data['user_id'])->firstOrFail();

        if ($user->id === $request->user()->id && $data['role'] !== 'owner' && $user->role === 'owner') {
            abort(422, 'You cannot remove your own owner role.');
        }

        $oldRole = $user->role;
        $user->update(['role' => $data['role']]);
        $user->syncRoles([$data['role']]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'user.role_assigned',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'metadata' => [
                'user_name' => $user->name,
                'from_role' => $oldRole,
                'to_role' => $data['role'],
            ],
        ]);

        return back()->with('success', "Assigned role '{$data['role']}' to {$user->name}.");
    }
}
