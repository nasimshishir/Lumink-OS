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

class RecycleBinTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_and_manager_can_access_recycle_bin(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $manager = User::factory()->create(['role' => 'manager']);

        $this->actingAs($owner)
            ->get('/recycle-bin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('recycle-bin/index')
                ->has('trashed')
                ->has('counts')
                ->where('isOwner', true)
            );

        $this->actingAs($manager)
            ->get('/recycle-bin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('recycle-bin/index')
                ->where('isOwner', false)
                ->where('canManage', true)
            );
    }

    public function test_specialist_cannot_access_recycle_bin(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);

        $this->actingAs($specialist)
            ->get('/recycle-bin')
            ->assertForbidden();
    }

    public function test_soft_deleting_task_moves_it_to_recycle_bin(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $task = Task::create([
            'title' => 'Write Video Script',
            'type' => 'content',
            'status' => 'todo',
            'priority' => 'high',
            'created_by' => $owner->id,
        ]);

        $this->actingAs($owner)
            ->delete("/tasks/{$task->id}")
            ->assertRedirect()
            ->assertSessionHas('success', "Task 'Write Video Script' moved to the Recycle Bin.");

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);

        $this->actingAs($owner)
            ->get('/recycle-bin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('recycle-bin/index')
                ->where('counts.tasks', 1)
                ->where('trashed.tasks.0.id', $task->id)
            );
    }

    public function test_soft_deleting_content_item_moves_it_to_recycle_bin(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Demo Co', 'slug' => 'demo-co', 'monthly_retainer' => 10000]);
        $content = ContentItem::create([
            'title' => 'Product Teaser Reel',
            'type' => 'reel',
            'stage' => 'idea',
            'priority' => 'medium',
            'business_id' => $business->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($owner)
            ->delete("/content/{$content->id}")
            ->assertRedirect('/content')
            ->assertSessionHas('success', "Content 'Product Teaser Reel' moved to the Recycle Bin.");

        $this->assertSoftDeleted('content_items', ['id' => $content->id]);

        $this->actingAs($owner)
            ->get('/recycle-bin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('recycle-bin/index')
                ->where('counts.content', 1)
                ->where('trashed.content.0.id', $content->id)
            );
    }

    public function test_soft_deleting_invoice_and_expense_moves_them_to_finance_trash(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Finance Client', 'slug' => 'finance-client', 'monthly_retainer' => 20000]);

        $invoice = Invoice::create([
            'business_id' => $business->id,
            'number' => 'INV-2026-TEST',
            'status' => 'sent',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(15)->toDateString(),
            'subtotal' => 20000,
            'total' => 20000,
        ]);

        $expense = Expense::create([
            'business_id' => $business->id,
            'allocation_type' => 'direct',
            'category' => 'equipment',
            'description' => 'Camera Lens Rental',
            'amount' => 5000,
            'spent_on' => now()->toDateString(),
            'created_by' => $owner->id,
        ]);

        $this->actingAs($owner)->delete("/invoices/{$invoice->id}")->assertRedirect();
        $this->actingAs($owner)->delete("/expenses/{$expense->id}")->assertRedirect();

        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
        $this->assertSoftDeleted('expenses', ['id' => $expense->id]);

        $this->actingAs($owner)
            ->get('/recycle-bin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('recycle-bin/index')
                ->where('counts.invoices', 1)
                ->where('counts.expenses', 1)
                ->where('counts.finance', 2)
            );
    }

    public function test_manager_can_restore_trashed_items(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $task = Task::create([
            'title' => 'Trashed Task',
            'type' => 'content',
            'status' => 'todo',
            'priority' => 'low',
        ]);
        $task->delete();

        $this->assertTrue($task->fresh()->trashed());

        $this->actingAs($manager)
            ->post("/recycle-bin/task/{$task->id}/restore")
            ->assertRedirect()
            ->assertSessionHas('success', 'Trashed Task has been restored from the Recycle Bin.');

        $this->assertFalse($task->fresh()->trashed());
    }

    public function test_owner_can_force_delete_trashed_item(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $task = Task::create([
            'title' => 'Doomed Task',
            'type' => 'content',
            'status' => 'todo',
            'priority' => 'low',
        ]);
        $task->delete();

        $this->actingAs($owner)
            ->delete("/recycle-bin/task/{$task->id}/force-delete")
            ->assertRedirect()
            ->assertSessionHas('success', 'Doomed Task has been permanently deleted.');

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_restore_all_in_category(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $t1 = Task::create(['title' => 'Task 1', 'type' => 'content', 'status' => 'todo', 'priority' => 'low']);
        $t2 = Task::create(['title' => 'Task 2', 'type' => 'content', 'status' => 'todo', 'priority' => 'low']);
        $t1->delete();
        $t2->delete();

        $this->assertEquals(2, Task::onlyTrashed()->count());

        $this->actingAs($owner)
            ->post('/recycle-bin/tasks/restore-all')
            ->assertRedirect()
            ->assertSessionHas('success', 'Restored 2 items in tasks from the Recycle Bin.');

        $this->assertEquals(0, Task::onlyTrashed()->count());
    }

    public function test_empty_trash(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $t1 = Task::create(['title' => 'Task 1', 'type' => 'content', 'status' => 'todo', 'priority' => 'low']);
        $b1 = Business::create(['name' => 'Biz 1', 'slug' => 'biz-1', 'monthly_retainer' => 5000]);
        $t1->delete();
        $b1->delete();

        $this->actingAs($owner)
            ->delete('/recycle-bin/empty?type=all')
            ->assertRedirect()
            ->assertSessionHas('success', 'Recycle Bin has been emptied (2 items permanently deleted).');

        $this->assertEquals(0, Task::onlyTrashed()->count());
        $this->assertEquals(0, Business::onlyTrashed()->count());
    }
}
