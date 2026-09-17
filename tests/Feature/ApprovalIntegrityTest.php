<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Business;
use App\Models\ContentItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_approval_link_accepts_only_one_response(): void
    {
        [$content, $approval] = $this->approval();

        $this->post("/approve/{$approval->token}", [
            'client_name' => 'Client',
            'action' => 'approved',
        ])->assertRedirect();

        $this->post("/approve/{$approval->token}", [
            'client_name' => 'Another person',
            'action' => 'changes_requested',
        ])->assertConflict();

        $this->assertDatabaseCount('approval_responses', 1);
        $this->assertDatabaseHas('content_items', [
            'id' => $content->id,
            'stage' => 'approved',
            'revision_number' => 1,
        ]);
    }

    public function test_stale_approval_link_cannot_change_a_newer_content_version(): void
    {
        [$content, $approval] = $this->approval();
        $content->update(['revision_number' => 2]);

        $this->post("/approve/{$approval->token}", [
            'client_name' => 'Client',
            'action' => 'approved',
        ])->assertConflict();

        $this->assertDatabaseCount('approval_responses', 0);
        $this->assertDatabaseHas('approval_requests', [
            'id' => $approval->id,
            'status' => 'pending',
            'responded_at' => null,
        ]);
    }

    public function test_creative_edits_start_a_new_revision_and_revoke_pending_approval_links(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        [$content, $approval] = $this->approval();
        $content->update(['stage' => 'approved']);

        $this->actingAs($owner)
            ->patch("/content/{$content->id}", ['script' => 'Updated script'])
            ->assertRedirect();

        $this->assertDatabaseHas('content_items', [
            'id' => $content->id,
            'stage' => 'editing',
            'revision_number' => 2,
            'script' => 'Updated script',
        ]);
        $this->assertNotNull($approval->fresh()->revoked_at);
    }

    public function test_new_approval_link_replaces_pending_link_and_moves_content_to_client_review(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        [$content, $approval] = $this->approval();
        $content->update(['stage' => 'editing']);

        $this->actingAs($owner)
            ->post("/content/{$content->id}/approvals")
            ->assertRedirect();

        $this->assertDatabaseHas('content_items', ['id' => $content->id, 'stage' => 'client_review']);
        $this->assertNotNull($approval->fresh()->revoked_at);
        $this->assertDatabaseCount('approval_requests', 2);
    }

    /** @return array{ContentItem, ApprovalRequest} */
    private function approval(): array
    {
        $business = Business::create([
            'name' => 'Client',
            'slug' => 'client',
            'monthly_retainer' => 10000,
        ]);
        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Campaign reel',
            'stage' => 'client_review',
            'revision_number' => 1,
        ]);
        $approval = ApprovalRequest::create([
            'content_item_id' => $content->id,
            'token' => 'approval-token',
            'status' => 'pending',
            'version' => 1,
            'expires_at' => now()->addDay(),
        ]);

        return [$content, $approval];
    }
}
