<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ContentInspiration;
use App\Models\ContentItem;
use App\Models\ContentStepProof;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContentStepProofAndInspirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_stage_to_in_progress(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Burger Lab', 'slug' => 'burger-lab', 'monthly_retainer' => 30000]);
        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Signature Smashed Burger Reel',
            'stage' => 'idea',
            'type' => 'reel',
            'priority' => 'high',
        ]);

        $response = $this->actingAs($owner)->post("/content/{$content->id}/proofs", [
            'stage' => 'scripted',
            'status' => 'in_progress',
            'notes' => 'Writing hook variations with team.',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('content_step_proofs', [
            'content_item_id' => $content->id,
            'stage' => 'scripted',
            'status' => 'in_progress',
            'user_id' => $owner->id,
            'notes' => 'Writing hook variations with team.',
        ]);
    }

    public function test_multiple_stages_can_be_in_progress_concurrently(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Burger Lab', 'slug' => 'burger-lab', 'monthly_retainer' => 30000]);
        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Signature Smashed Burger Reel',
            'stage' => 'idea',
            'type' => 'reel',
        ]);

        // Producer starts shoot scheduling
        $this->actingAs($owner)->post("/content/{$content->id}/proofs", [
            'stage' => 'shoot_scheduled',
            'status' => 'in_progress',
        ])->assertRedirect();

        // Writer starts scripting
        $this->actingAs($owner)->post("/content/{$content->id}/proofs", [
            'stage' => 'scripted',
            'status' => 'in_progress',
        ])->assertRedirect();

        $this->assertEquals(2, ContentStepProof::where('content_item_id', $content->id)->where('status', 'in_progress')->count());
    }

    public function test_submitting_stage_completion_without_proof_fails_validation(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Burger Lab', 'slug' => 'burger-lab', 'monthly_retainer' => 30000]);
        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Signature Smashed Burger Reel',
            'stage' => 'idea',
            'type' => 'reel',
        ]);

        // Attempt to complete without proof_url, files, or notes
        $response = $this->actingAs($owner)->post("/content/{$content->id}/proofs", [
            'stage' => 'shot',
            'status' => 'completed',
            'proof_url' => '',
            'notes' => '',
        ]);

        $response->assertSessionHasErrors(['proof_url', 'notes']);
        $this->assertDatabaseMissing('content_step_proofs', [
            'content_item_id' => $content->id,
            'stage' => 'shot',
            'status' => 'completed',
        ]);
    }

    public function test_user_can_complete_stage_with_valid_proof_url_and_notes(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Burger Lab', 'slug' => 'burger-lab', 'monthly_retainer' => 30000]);
        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Signature Smashed Burger Reel',
            'stage' => 'idea',
            'type' => 'reel',
        ]);

        $response = $this->actingAs($owner)->post("/content/{$content->id}/proofs", [
            'stage' => 'shot',
            'status' => 'completed',
            'proof_url' => 'https://drive.google.com/drive/folders/test-raw-footage',
            'notes' => '3 camera reels shot with Sony FX3, 4K 60fps.',
            'advance_stage' => 1,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('content_step_proofs', [
            'content_item_id' => $content->id,
            'stage' => 'shot',
            'status' => 'completed',
            'proof_url' => 'https://drive.google.com/drive/folders/test-raw-footage',
        ]);

        $content->refresh();
        $this->assertEquals('shot', $content->stage);
        $this->assertEquals('https://drive.google.com/drive/folders/test-raw-footage', $content->raw_footage_url);
    }

    public function test_user_can_complete_stage_with_uploaded_file(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Burger Lab', 'slug' => 'burger-lab', 'monthly_retainer' => 30000]);
        $content = ContentItem::create(['business_id' => $business->id, 'title' => 'Test Reel', 'stage' => 'planned']);

        $file = UploadedFile::fake()->image('storyboard.png');

        $response = $this->actingAs($owner)->post("/content/{$content->id}/proofs", [
            'stage' => 'planned',
            'status' => 'completed',
            'notes' => 'Storyboard approved with creative director.',
            'files' => [$file],
        ]);

        $response->assertRedirect();

        /** @var ContentStepProof $proof */
        $proof = ContentStepProof::where('content_item_id', $content->id)->where('stage', 'planned')->first();
        $this->assertNotNull($proof);
        $this->assertEquals('completed', $proof->status);
        $this->assertCount(1, $proof->attachments);
        $this->assertEquals('storyboard.png', $proof->attachments[0]['name']);
    }

    public function test_user_can_reset_stage_to_pending(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Test', 'slug' => 'test', 'monthly_retainer' => 10000]);
        $content = ContentItem::create(['business_id' => $business->id, 'title' => 'Test Reel', 'stage' => 'editing']);

        $proof = ContentStepProof::create([
            'content_item_id' => $content->id,
            'user_id' => $owner->id,
            'stage' => 'editing',
            'status' => 'completed',
            'proof_url' => 'https://frame.io/preview',
            'notes' => 'Rough cut v1 ready.',
            'verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post("/content/{$content->id}/proofs", [
                'stage' => 'editing',
                'status' => 'pending',
            ])
            ->assertRedirect();

        $proof->refresh();
        $this->assertEquals('pending', $proof->status);
    }

    public function test_user_can_delete_stage_proof(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Test', 'slug' => 'test', 'monthly_retainer' => 10000]);
        $content = ContentItem::create(['business_id' => $business->id, 'title' => 'Test Reel', 'stage' => 'editing']);

        $proof = ContentStepProof::create([
            'content_item_id' => $content->id,
            'user_id' => $owner->id,
            'stage' => 'editing',
            'status' => 'completed',
            'proof_url' => 'https://frame.io/preview',
            'notes' => 'Rough cut v1 ready.',
            'verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->delete("/content/{$content->id}/proofs/{$proof->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('content_step_proofs', ['id' => $proof->id]);
    }

    public function test_user_can_add_inspiration_url_and_image(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Test', 'slug' => 'test', 'monthly_retainer' => 10000]);
        $content = ContentItem::create(['business_id' => $business->id, 'title' => 'Test Reel', 'stage' => 'idea']);

        // Add URL inspiration
        $this->actingAs($owner)->post("/content/{$content->id}/inspirations", [
            'title' => 'Trending Food Hook on TikTok',
            'type' => 'link',
            'url' => 'https://tiktok.com/@foodie/video/12345',
            'notes' => 'Notice the split-second zoom effect at 0:02.',
            'tags' => 'hook, pacing, zoom',
        ])->assertRedirect();

        $this->assertDatabaseHas('content_inspirations', [
            'content_item_id' => $content->id,
            'title' => 'Trending Food Hook on TikTok',
            'type' => 'link',
            'url' => 'https://tiktok.com/@foodie/video/12345',
        ]);

        // Add Image inspiration
        $image = UploadedFile::fake()->image('color_moodboard.jpg');
        $this->actingAs($owner)->post("/content/{$content->id}/inspirations", [
            'title' => 'Moody Lighting Reference',
            'type' => 'image',
            'image' => $image,
            'notes' => 'Warm 3200K key light with teal rim light.',
            'tags' => 'lighting, color',
        ])->assertRedirect();

        $this->assertDatabaseHas('content_inspirations', [
            'content_item_id' => $content->id,
            'title' => 'Moody Lighting Reference',
            'type' => 'image',
        ]);
    }

    public function test_inspiration_link_requires_url(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Test', 'slug' => 'test', 'monthly_retainer' => 10000]);
        $content = ContentItem::create(['business_id' => $business->id, 'title' => 'Test Reel', 'stage' => 'idea']);

        $response = $this->actingAs($owner)->post("/content/{$content->id}/inspirations", [
            'title' => 'Invalid Link Without URL',
            'type' => 'link',
            'url' => '',
        ]);

        $response->assertSessionHasErrors(['url']);
    }

    public function test_content_show_renders_proofs_and_inspirations(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = Business::create(['name' => 'Test Cafe', 'slug' => 'test-cafe', 'monthly_retainer' => 20000]);
        $content = ContentItem::create(['business_id' => $business->id, 'title' => 'Latte Art Reel', 'stage' => 'shot']);

        ContentStepProof::create([
            'content_item_id' => $content->id,
            'user_id' => $owner->id,
            'stage' => 'shot',
            'status' => 'completed',
            'proof_url' => 'https://drive.google.com/raw-footage',
            'notes' => 'All shots verified.',
            'verified_at' => now(),
        ]);

        ContentInspiration::create([
            'content_item_id' => $content->id,
            'user_id' => $owner->id,
            'title' => 'Coffee Pour Reference',
            'type' => 'link',
            'url' => 'https://instagram.com/reel/abc',
        ]);

        $this->actingAs($owner)
            ->get("/content/{$content->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('content/show')
                ->has('content.proofs', 1)
                ->has('content.inspirations', 1)
                ->where('canSubmitProof', true)
                ->where('canManageInspirations', true)
            );
    }
}
