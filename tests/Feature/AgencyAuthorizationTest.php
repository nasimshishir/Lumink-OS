<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AgencyAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_specialist_dashboard_does_not_receive_finance_or_management_lists(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create([
            'name' => 'Private Client',
            'slug' => 'private-client',
            'monthly_retainer' => 50000,
        ]);
        Task::create([
            'owner_id' => $owner->id,
            'title' => 'Unrelated task',
            'status' => 'todo',
        ]);

        $this->actingAs($specialist)
            ->get('/today')
            ->assertInertia(fn (Assert $page) => $page
                ->where('finance', null)
                ->has('businesses', 0)
                ->has('users', 0)
                ->has('tasks', 0)
                ->where('canCreateTasks', false));
    }

    public function test_specialist_cannot_open_business_management_or_create_work(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);
        $business = Business::create([
            'name' => 'Client',
            'slug' => 'client',
            'monthly_retainer' => 10000,
        ]);

        $this->actingAs($specialist)->get('/businesses')->assertForbidden();
        $this->actingAs($specialist)->get("/businesses/{$business->id}")->assertForbidden();
        $this->actingAs($specialist)->post('/tasks', [
            'title' => 'Unauthorized task',
            'type' => 'general',
            'priority' => 'medium',
        ])->assertForbidden();
        $this->actingAs($specialist)->post('/content', [
            'title' => 'Unauthorized content',
            'type' => 'reel',
            'business_id' => $business->id,
        ])->assertForbidden();
    }

    public function test_specialist_only_sees_assigned_content_and_calendar_tasks(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);
        $other = User::factory()->create(['role' => 'specialist']);
        $business = Business::create([
            'name' => 'Client',
            'slug' => 'client',
            'monthly_retainer' => 10000,
        ]);
        $assignedContent = ContentItem::create([
            'business_id' => $business->id,
            'owner_id' => $specialist->id,
            'title' => 'Assigned content',
        ]);
        $unrelatedContent = ContentItem::create([
            'business_id' => $business->id,
            'owner_id' => $other->id,
            'title' => 'Unrelated content',
        ]);
        $assignedTask = Task::create([
            'owner_id' => $specialist->id,
            'title' => 'Assigned task',
            'status' => 'todo',
            'due_at' => now()->addDay(),
        ]);
        Task::create([
            'owner_id' => $other->id,
            'title' => 'Unrelated task',
            'status' => 'todo',
            'due_at' => now()->addDay(),
        ]);

        $this->actingAs($specialist)
            ->get('/content')
            ->assertInertia(fn (Assert $page) => $page
                ->has('content', 1)
                ->where('content.0.id', $assignedContent->id));
        $this->actingAs($specialist)->get("/content/{$assignedContent->id}")->assertOk();
        $this->actingAs($specialist)->get("/content/{$unrelatedContent->id}")->assertForbidden();
        $this->actingAs($specialist)
            ->get('/calendar')
            ->assertInertia(fn (Assert $page) => $page
                ->has('tasks', 1)
                ->where('tasks.0.id', $assignedTask->id));
    }
}
