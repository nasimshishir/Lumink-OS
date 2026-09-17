<?php

namespace Tests\Feature;

use App\Mail\TeamInvitationMail;
use App\Models\ApprovalRequest;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Invitation;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AgencyOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_open_finance_and_specialist_cannot(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $specialist = User::factory()->create(['role' => 'specialist']);

        $this->actingAs($owner)->get('/finance')->assertOk();
        $this->actingAs($specialist)->get('/finance')->assertForbidden();
    }

    public function test_assigned_specialist_can_complete_a_task(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);
        $task = Task::create([
            'owner_id' => $specialist->id,
            'created_by' => $specialist->id,
            'title' => 'Edit restaurant reel',
            'type' => 'video_edit',
            'status' => 'todo',
            'priority' => 'high',
        ]);

        $this->actingAs($specialist)
            ->patch("/tasks/{$task->id}", ['status' => 'done'])
            ->assertRedirect();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'status' => 'done']);
    }

    public function test_client_can_approve_content_without_an_account(): void
    {
        $business = Business::create([
            'name' => 'Test Restaurant',
            'slug' => 'test-restaurant',
            'monthly_retainer' => 25000,
        ]);
        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Menu Reel',
            'stage' => 'client_review',
        ]);
        ApprovalRequest::create([
            'content_item_id' => $content->id,
            'token' => 'secure-demo-token',
            'status' => 'pending',
            'version' => 1,
            'expires_at' => now()->addDay(),
        ]);

        $this->post('/approve/secure-demo-token', [
            'client_name' => 'Restaurant Owner',
            'action' => 'approved',
            'comment' => 'Ready to publish.',
        ])->assertRedirect();

        $this->assertDatabaseHas('approval_responses', [
            'client_name' => 'Restaurant Owner',
            'action' => 'approved',
        ]);
        $this->assertDatabaseHas('content_items', [
            'id' => $content->id,
            'stage' => 'approved',
        ]);
    }

    public function test_owner_can_invite_a_google_account_with_a_role(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)->post('/invitations', [
            'email' => 'editor@example.com',
            'role' => 'specialist',
        ])->assertSessionHas('success', 'Access authorized and invitation email sent.')
          ->assertRedirect();

        $this->assertDatabaseHas('invitations', [
            'email' => 'editor@example.com',
            'role' => 'specialist',
        ]);

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\TeamInvitationMail::class, function ($mail) {
            return $mail->hasTo('editor@example.com') && $mail->invitation->role === 'specialist';
        });
    }

    public function test_invitation_creation_survives_mail_transport_failure(): void
    {
        \Illuminate\Support\Facades\Mail::shouldReceive('to')->andThrow(new \Exception('Mail gun broke'));
        \Illuminate\Support\Facades\Log::shouldReceive('error')->once();

        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)->post('/invitations', [
            'email' => 'broken@example.com',
            'role' => 'manager',
        ])->assertSessionHas('error', 'Access authorized, but we could not send the invitation email. Please notify them manually.')
          ->assertRedirect();

        $this->assertDatabaseHas('invitations', [
            'email' => 'broken@example.com',
            'role' => 'manager',
        ]);
    }

    public function test_owner_can_view_pending_invitations_on_team_page(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        Invitation::create([
            'email' => 'pending@example.com',
            'role' => 'specialist',
            'invited_by' => $owner->id,
            'accepted_at' => null,
        ]);

        $this->actingAs($owner)
            ->get('/team')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('team/index')
                ->has('invitations', 1)
                ->where('invitations.0.email', 'pending@example.com')
            );
    }

    public function test_owner_can_revoke_a_pending_invitation(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $invitation = Invitation::create([
            'email' => 'revoke@example.com',
            'role' => 'specialist',
            'invited_by' => $owner->id,
            'accepted_at' => null,
        ]);

        $this->actingAs($owner)
            ->delete("/invitations/{$invitation->id}")
            ->assertRedirect()
            ->assertSessionHas('success', 'Invitation for revoke@example.com has been revoked.');

        $this->assertDatabaseMissing('invitations', ['id' => $invitation->id]);
        $this->assertDatabaseHas('audit_events', [
            'user_id' => $owner->id,
            'event' => 'invitation.revoked',
            'auditable_id' => $invitation->id,
        ]);
    }

    public function test_owner_can_resend_an_invitation(): void
    {
        Mail::fake();

        $owner = User::factory()->create(['role' => 'owner']);
        $invitation = Invitation::create([
            'email' => 'resend@example.com',
            'role' => 'manager',
            'invited_by' => $owner->id,
            'accepted_at' => null,
        ]);

        $this->actingAs($owner)
            ->post("/invitations/{$invitation->id}/resend")
            ->assertRedirect()
            ->assertSessionHas('success', 'Invitation resent to resend@example.com.');

        Mail::assertSent(TeamInvitationMail::class, function ($mail) {
            return $mail->hasTo('resend@example.com');
        });

        $this->assertDatabaseHas('audit_events', [
            'user_id' => $owner->id,
            'event' => 'invitation.resent',
            'auditable_id' => $invitation->id,
        ]);
    }

    public function test_owner_can_deactivate_and_reactivate_a_team_member(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $member = User::factory()->create(['role' => 'specialist', 'is_active' => true]);

        $this->actingAs($owner)
            ->patch("/team/{$member->id}/toggle-status")
            ->assertRedirect()
            ->assertSessionHas('success', "{$member->name} has been deactivated.");

        $this->assertFalse($member->fresh()->is_active);
        $this->assertDatabaseHas('audit_events', [
            'user_id' => $owner->id,
            'event' => 'team_member.deactivated',
            'auditable_id' => $member->id,
        ]);

        $this->actingAs($owner)
            ->patch("/team/{$member->id}/toggle-status")
            ->assertRedirect()
            ->assertSessionHas('success', "{$member->name} has been reactivated.");

        $this->assertTrue($member->fresh()->is_active);
        $this->assertDatabaseHas('audit_events', [
            'user_id' => $owner->id,
            'event' => 'team_member.activated',
            'auditable_id' => $member->id,
        ]);
    }

    public function test_deactivated_team_member_is_logged_out_by_ensure_active_middleware(): void
    {
        $member = User::factory()->create(['role' => 'specialist', 'is_active' => false]);

        $this->actingAs($member)
            ->get('/dashboard')
            ->assertRedirect('/login')
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_owner_cannot_deactivate_themselves(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->patch("/team/{$owner->id}/toggle-status")
            ->assertForbidden();

        $this->assertTrue($owner->fresh()->is_active);
    }

    public function test_owner_cannot_deactivate_last_remaining_active_owner(): void
    {
        $owner = User::factory()->create(['role' => 'owner', 'is_active' => true]);
        $secondOwner = User::factory()->create(['role' => 'owner', 'is_active' => false]);

        $this->actingAs($owner);

        // Deactivating a different owner when only 1 active owner remains
        $activeOwner2 = User::factory()->create(['role' => 'owner', 'is_active' => true]);

        // There are 2 active owners: $owner and $activeOwner2. Deactivating $activeOwner2 succeeds.
        $this->patch("/team/{$activeOwner2->id}/toggle-status")->assertRedirect();
        $this->assertFalse($activeOwner2->fresh()->is_active);

        // Now only $owner is active. If someone attempts to deactivate $owner (or if another owner attempted to),
        // let's test that an active owner can't be deactivated if they are the sole active owner.
        // Acting as a manager/another user should be blocked by owner middleware, but let's test the controller logic:
        $anotherAdmin = User::factory()->create(['role' => 'owner', 'is_active' => true]);
        // Now deactivating $anotherAdmin leaves $owner as the last one.
        $this->patch("/team/{$anotherAdmin->id}/toggle-status")->assertRedirect();
        $this->assertFalse($anotherAdmin->fresh()->is_active);

        // Attempting to deactivate $owner via toggleStatus directly or if $anotherAdmin was logged in:
        $this->actingAs($anotherAdmin)
            ->patch("/team/{$owner->id}/toggle-status")
            ->assertStatus(422);
    }

    public function test_deactivated_users_are_excluded_from_business_assignee_list(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $activeMember = User::factory()->create(['name' => 'Active Alice', 'is_active' => true]);
        $deactivatedMember = User::factory()->create(['name' => 'Inactive Bob', 'is_active' => false]);
        $business = Business::create([
            'name' => 'Acme Corp',
            'slug' => 'acme-corp',
            'monthly_retainer' => 5000,
        ]);

        $this->actingAs($owner)
            ->get("/businesses/{$business->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('businesses/show')
                ->has('users', 2) // $owner and $activeMember
                ->where('users.0.name', 'Active Alice')
            );
    }
}

