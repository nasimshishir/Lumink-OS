<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        if (empty(config('permission.table_names')) && file_exists(config_path('permission.php'))) {
            $config = require config_path('permission.php');
            config(['permission' => $config]);
        }

        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Businesses
            'businesses.view',
            'businesses.create',
            'businesses.edit',
            'businesses.delete',
            'businesses.restore',

            // Tasks
            'tasks.view',
            'tasks.create',
            'tasks.edit',
            'tasks.delete',
            'tasks.restore',

            // Content
            'content.view',
            'content.create',
            'content.edit',
            'content.delete',
            'content.restore',

            // Finance
            'finance.view',
            'invoices.manage',
            'invoices.delete',
            'expenses.manage',
            'expenses.delete',
            'finance.manage',

            // Reports
            'reports.view',
            'reports.create',

            // Team
            'team.view',
            'team.manage',

            // Roles & Permissions
            'roles.view',
            'roles.manage',

            // Recycle Bin
            'recycle_bin.view',
            'recycle_bin.restore',
            'recycle_bin.force_delete',
            'recycle_bin.empty',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Roles
        $ownerRole = Role::firstOrCreate(['name' => 'owner', 'guard_name' => 'web']);
        $ownerRole->syncPermissions(Permission::all());

        $managerRole = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $managerRole->syncPermissions([
            'businesses.view',
            'businesses.create',
            'businesses.edit',
            'businesses.delete',
            'businesses.restore',
            'tasks.view',
            'tasks.create',
            'tasks.edit',
            'tasks.delete',
            'tasks.restore',
            'content.view',
            'content.create',
            'content.edit',
            'content.delete',
            'content.restore',
            'reports.view',
            'reports.create',
            'team.view',
            'recycle_bin.view',
            'recycle_bin.restore',
        ]);

        $specialistRole = Role::firstOrCreate(['name' => 'specialist', 'guard_name' => 'web']);
        $specialistRole->syncPermissions([
            'tasks.view',
            'tasks.edit',
            'content.view',
            'content.edit',
        ]);

        // Assign Spatie roles to existing users based on their role column
        if (class_exists(User::class)) {
            User::all()->each(function (User $user) use ($ownerRole, $managerRole, $specialistRole) {
                if ($user->role === 'owner') {
                    $user->syncRoles([$ownerRole]);
                } elseif ($user->role === 'manager') {
                    $user->syncRoles([$managerRole]);
                } else {
                    $user->syncRoles([$specialistRole]);
                }
            });
        }
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
