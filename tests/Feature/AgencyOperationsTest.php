<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)->post('/invitations', [
            'email' => 'editor@example.com',
            'role' => 'specialist',
        ])->assertRedirect();

        $this->assertDatabaseHas('invitations', [
            'email' => 'editor@example.com',
            'role' => 'specialist',
        ]);
    }
}
