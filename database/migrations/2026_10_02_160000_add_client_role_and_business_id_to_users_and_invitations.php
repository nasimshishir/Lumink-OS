<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('business_id')->nullable()->after('role')->constrained('businesses')->nullOnDelete();
        });

        Schema::table('invitations', function (Blueprint $table) {
            $table->foreignId('business_id')->nullable()->after('role')->constrained('businesses')->nullOnDelete();
        });

        // Register client permissions and role
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $clientPermissions = [
            'approvals.view',
            'approvals.respond',
        ];

        foreach ($clientPermissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        $clientRole = Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);
        $clientRole->syncPermissions([
            'content.view',
            'approvals.view',
            'approvals.respond',
        ]);

        $ownerRole = Role::firstOrCreate(['name' => 'owner', 'guard_name' => 'web']);
        $ownerRole->syncPermissions(Permission::all());
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('business_id');
        });

        Schema::table('invitations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('business_id');
        });

        Role::where('name', 'client')->delete();
        Permission::whereIn('name', ['approvals.view', 'approvals.respond'])->delete();
    }
};
