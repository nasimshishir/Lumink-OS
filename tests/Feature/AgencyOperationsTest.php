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
}

