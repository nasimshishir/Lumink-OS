<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BusinessCascadeTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_business_cascades_soft_delete_to_child_entities(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Acme Corp', 'slug' => 'acme-corp', 'monthly_retainer' => 15000]);

        $task = Task::create([
            'title' => 'Acme Shoot Prep',
            'type' => 'shoot',
            'status' => 'todo',
            'priority' => 'high',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        $content = ContentItem::create([
            'title' => 'Acme Promo Reel',
            'type' => 'reel',
            'stage' => 'idea',
            'priority' => 'medium',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        $invoice = Invoice::create([
            'business_id' => $business->id,
            'number' => 'INV-ACME-001',
            'status' => 'draft',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'subtotal' => 15000,
            'total' => 15000,
        ]);

        $expense = Expense::create([
            'business_id' => $business->id,
            'allocation_type' => 'direct',
            'category' => 'software',
            'description' => 'Acme Cloud Storage',
            'amount' => 2000,
            'spent_on' => now()->toDateString(),
            'created_by' => $owner->id,
        ]);

        // Soft delete the business
        $this->actingAs($owner)
            ->delete("/businesses/{$business->id}")
            ->assertRedirect('/businesses')
            ->assertSessionHas('success', 'Acme Corp moved to the Recycle Bin.');

        $this->assertSoftDeleted('businesses', ['id' => $business->id]);
        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
        $this->assertSoftDeleted('content_items', ['id' => $content->id]);
        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
        $this->assertSoftDeleted('expenses', ['id' => $expense->id]);
    }

    public function test_tasks_belonging_to_deleted_business_do_not_appear_in_operational_views(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Beta Corp', 'slug' => 'beta-corp', 'monthly_retainer' => 10000]);

        $task = Task::create([
            'title' => 'Beta Campaign Planning',
            'type' => 'strategy',
            'status' => 'in_progress',
            'priority' => 'high',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
            'due_at' => now()->addHours(2),
        ]);

        // Delete business and cascade
        $business->delete();
        $task->delete();

        // 1. My Work (/my-work)
        $this->actingAs($owner)
            ->get('/my-work')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('work/index')
                ->where('tasks', fn ($tasks) => collect($tasks)->where('id', $task->id)->isEmpty())
            );

        // 2. Today (/today)
        $this->actingAs($owner)
            ->get('/today')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('today')
                ->where('tasks', fn ($tasks) => collect($tasks)->where('id', $task->id)->isEmpty())
            );

        // 3. Calendar (/calendar)
        $this->actingAs($owner)
            ->get('/calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('calendar/index')
                ->where('events', fn ($events) => collect($events)->where('extendedProps.id', $task->id)->isEmpty())
            );
    }

    public function test_restoring_business_restores_cascaded_child_entities(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Gamma Ltd', 'slug' => 'gamma-ltd', 'monthly_retainer' => 8000]);

        $task = Task::create([
            'title' => 'Gamma Logo Animation',
            'type' => 'design',
            'status' => 'todo',
            'priority' => 'low',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        $content = ContentItem::create([
            'title' => 'Gamma Brand Video',
            'type' => 'video',
            'stage' => 'idea',
            'priority' => 'high',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        // Soft delete business via controller (which records audit event with cascaded IDs)
        $this->actingAs($owner)->delete("/businesses/{$business->id}")->assertRedirect();

        $this->assertTrue($task->fresh()->trashed());
        $this->assertTrue($content->fresh()->trashed());

        // Restore business via Recycle Bin
        $this->actingAs($owner)
            ->post("/recycle-bin/businesses/{$business->id}/restore")
            ->assertRedirect()
            ->assertSessionHas('success', 'Gamma Ltd has been restored from the Recycle Bin.');

        $this->assertFalse($business->fresh()->trashed());
        $this->assertFalse($task->fresh()->trashed());
        $this->assertFalse($content->fresh()->trashed());
    }

    public function test_force_deleting_business_permanently_removes_all_child_entities(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Delta Tech', 'slug' => 'delta-tech', 'monthly_retainer' => 12000]);

        $task = Task::create([
            'title' => 'Delta Site Redesign',
            'type' => 'design',
            'status' => 'todo',
            'priority' => 'medium',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        $content = ContentItem::create([
            'title' => 'Delta Reel',
            'type' => 'reel',
            'stage' => 'idea',
            'priority' => 'medium',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        // Delete business
        $this->actingAs($owner)->delete("/businesses/{$business->id}");

        // Force delete business from Recycle Bin
        $this->actingAs($owner)
            ->delete("/recycle-bin/businesses/{$business->id}/force-delete")
            ->assertRedirect()
            ->assertSessionHas('success', 'Delta Tech has been permanently deleted.');

        $this->assertDatabaseMissing('businesses', ['id' => $business->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('content_items', ['id' => $content->id]);
    }

    public function test_super_admin_has_authority_to_update_and_delete_any_task_and_content(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $specialist = User::factory()->create(['role' => 'specialist']);

        $business = Business::create(['name' => 'Epsilon Media', 'slug' => 'epsilon-media', 'monthly_retainer' => 5000]);

        // Create task owned by specialist
        $task = Task::create([
            'title' => 'Specialist Task',
            'type' => 'content',
            'status' => 'todo',
            'priority' => 'low',
            'business_id' => $business->id,
            'owner_id' => $specialist->id,
            'created_by' => $specialist->id,
        ]);

        // Create content owned by specialist
        $content = ContentItem::create([
            'title' => 'Specialist Content',
            'type' => 'post',
            'stage' => 'idea',
            'priority' => 'low',
            'business_id' => $business->id,
            'owner_id' => $specialist->id,
        ]);

        // Super admin updates task
        $this->actingAs($owner)
            ->patch("/tasks/{$task->id}", [
                'title' => 'Specialist Task Updated by Super Admin',
                'priority' => 'high',
                'status' => 'in_progress',
                'estimate_minutes' => 120,
            ])
            ->assertRedirect()
            ->assertSessionHas('success', "Task 'Specialist Task Updated by Super Admin' updated.");

        $this->assertEquals('Specialist Task Updated by Super Admin', $task->fresh()->title);
        $this->assertEquals('high', $task->fresh()->priority);
        $this->assertEquals('in_progress', $task->fresh()->status);
        $this->assertEquals(120, $task->fresh()->estimate_minutes);

        // Super admin updates content
        $this->actingAs($owner)
            ->patch("/content/{$content->id}", [
                'title' => 'Specialist Content Updated by Super Admin',
                'priority' => 'high',
                'type' => 'carousel',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertEquals('Specialist Content Updated by Super Admin', $content->fresh()->title);
        $this->assertEquals('high', $content->fresh()->priority);

        // Super admin deletes content
        $this->actingAs($owner)
            ->delete("/content/{$content->id}")
            ->assertRedirect('/content');

        $this->assertSoftDeleted('content_items', ['id' => $content->id]);

        // Super admin deletes task
        $this->actingAs($owner)
            ->delete("/tasks/{$task->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
    }
}
