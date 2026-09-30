<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_roles_and_permissions_page(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->get('/roles')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('roles/index')
                ->has('roles')
                ->has('permissionGroups')
                ->has('users')
                ->where('isOwner', true)
            );
    }

    public function test_specialist_and_manager_cannot_view_roles_without_permission(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);
        $manager = User::factory()->create(['role' => 'manager']);

        $this->actingAs($specialist)
            ->get('/roles')
            ->assertForbidden();

        $this->actingAs($manager)
            ->get('/roles')
            ->assertForbidden();
    }

    public function test_owner_can_create_custom_role(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post('/roles', [
                'name' => 'content_strategist',
                'permissions' => [
                    'content.view',
                    'content.create',
                    'content.edit',
                    'tasks.view',
                ],
            ])
            ->assertRedirect()
            ->assertSessionHas('success', "Role 'content_strategist' has been created.");

        $this->assertDatabaseHas('roles', ['name' => 'content_strategist']);

        $role = Role::findByName('content_strategist');
        $this->assertTrue($role->hasPermissionTo('content.view'));
        $this->assertTrue($role->hasPermissionTo('content.create'));
        $this->assertFalse($role->hasPermissionTo('finance.view'));
    }

    public function test_owner_can_create_custom_role_with_spaces_and_display_name(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post('/roles', [
                'name' => 'Video Editor',
                'permissions' => ['content.view'],
            ])
            ->assertRedirect()
            ->assertSessionHas('success', "Role 'video_editor' has been created.");

        $this->assertDatabaseHas('roles', ['name' => 'video_editor']);
    }

    public function test_create_custom_role_rejects_invalid_characters_with_custom_message(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post('/roles', [
                'name' => 'Invalid@Role!',
                'permissions' => [],
            ])
            ->assertSessionHasErrors([
                'name' => 'The role name may only contain letters, numbers, spaces, and underscores.',
            ]);
    }

    public function test_owner_can_update_role_permissions(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $role = Role::create(['name' => 'video_lead', 'guard_name' => 'web']);
        $role->givePermissionTo('content.view');

        $this->actingAs($owner)
            ->patch("/roles/{$role->id}", [
                'name' => 'video_director',
                'permissions' => ['content.view', 'content.edit', 'tasks.create'],
            ])
            ->assertRedirect()
            ->assertSessionHas('success', "Role 'video_director' has been updated.");

        $this->assertEquals('video_director', $role->fresh()->name);
        $this->assertTrue($role->fresh()->hasPermissionTo('tasks.create'));
    }

    public function test_owner_cannot_delete_system_role(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $systemRole = Role::findByName('manager');

        $this->actingAs($owner)
            ->delete("/roles/{$systemRole->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('roles', ['id' => $systemRole->id]);
    }

    public function test_owner_can_delete_unused_custom_role(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $customRole = Role::create(['name' => 'temporary_auditor', 'guard_name' => 'web']);

        $this->actingAs($owner)
            ->delete("/roles/{$customRole->id}")
            ->assertRedirect()
            ->assertSessionHas('success', "Role 'temporary_auditor' has been removed.");

        $this->assertDatabaseMissing('roles', ['id' => $customRole->id]);
    }

    public function test_owner_can_assign_role_to_user(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $member = User::factory()->create(['role' => 'specialist']);

        $this->actingAs($owner)
            ->post('/roles/assign-user', [
                'user_id' => $member->id,
                'role' => 'manager',
            ])
            ->assertRedirect()
            ->assertSessionHas('success', "Assigned role 'manager' to {$member->name}.");

        $member->refresh();
        $this->assertEquals('manager', $member->role);
        $this->assertTrue($member->hasRole('manager'));
        $this->assertTrue($member->canManageOperations());
    }

    public function test_owner_cannot_demote_themselves(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post('/roles/assign-user', [
                'user_id' => $owner->id,
                'role' => 'specialist',
            ])
            ->assertStatus(422);

        $this->assertEquals('owner', $owner->fresh()->role);
    }
}
