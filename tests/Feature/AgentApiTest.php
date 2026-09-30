<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\ShootSession;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_discovery_endpoints_are_accessible_without_auth(): void
    {
        $response = $this->getJson('/api/v1/agent/capabilities');
        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('system', 'Lumink OS - Agency Operating System')
            ->assertJsonPath('version', '1.0.0')
            ->assertJsonStructure([
                'status',
                'system',
                'version',
                'agent_role',
                'auth',
                'workflows',
                'enums',
                'active_businesses',
            ]);

        $guide = $this->get('/api/v1/agent/guide');
        $guide->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=UTF-8')
            ->assertSee('Lumink OS AI Agent Operating Manual');

        $openapi = $this->getJson('/api/v1/openapi.json');
        $openapi->assertOk()
            ->assertJsonPath('openapi', '3.0.3')
            ->assertJsonPath('info.title', 'Lumink OS AI Agent API');
    }

    public function test_unauthenticated_requests_to_data_endpoints_are_rejected(): void
    {
        $this->getJson('/api/v1/businesses')->assertUnauthorized();
        $this->postJson('/api/v1/content', [])->assertUnauthorized();
        $this->getJson('/api/v1/tasks')->assertUnauthorized();
        $this->getJson('/api/v1/shoots')->assertUnauthorized();
    }

    public function test_authenticated_agent_can_query_businesses(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $token = $user->createToken('test-agent', ['*'])->plainTextToken;

        Business::create([
            'name' => 'Lumink Studios',
            'slug' => 'lumink-studios',
            'monthly_retainer' => 35000,
            'status' => 'active',
            'drive_folder_url' => 'https://drive.google.com/drive/folders/business-drive-123',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/businesses');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Lumink Studios')
            ->assertJsonPath('data.0.drive_folder_url', 'https://drive.google.com/drive/folders/business-drive-123');
    }

    public function test_authenticated_agent_can_create_content_with_embedded_tasks(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $token = $user->createToken('test-agent', ['*'])->plainTextToken;

        $business = Business::create([
            'name' => 'Burger House',
            'slug' => 'burger-house',
            'monthly_retainer' => 20000,
        ]);

        $payload = [
            'business_id' => $business->id,
            'title' => 'Signature Double Smash Reel',
            'type' => 'reel',
            'stage' => 'planned',
            'brief' => 'Close up sizzle on hot flat top grill.',
            'publish_at' => now()->addDays(7)->toDateTimeString(),
            'tasks' => [
                [
                    'title' => 'Write 30s Hook and Script',
                    'type' => 'content',
                    'priority' => 'high',
                    'estimate_minutes' => 45,
                ],
                [
                    'title' => 'Film Sizzle Reel Shots',
                    'type' => 'shoot',
                    'priority' => 'high',
                    'estimate_minutes' => 90,
                ],
                [
                    'title' => 'Color Grade & Sound Design',
                    'type' => 'editing',
                    'priority' => 'medium',
                    'estimate_minutes' => 120,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/content', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'Signature Double Smash Reel')
            ->assertJsonPath('data.stage', 'planned')
            ->assertJsonCount(3, 'data.tasks');

        $contentId = $response->json('data.id');

        $this->assertDatabaseHas('content_items', [
            'id' => $contentId,
            'title' => 'Signature Double Smash Reel',
            'business_id' => $business->id,
        ]);

        $this->assertDatabaseCount('tasks', 3);
        $this->assertDatabaseHas('tasks', [
            'content_item_id' => $contentId,
            'title' => 'Write 30s Hook and Script',
            'type' => 'content',
            'status' => 'todo',
        ]);
    }

    public function test_authenticated_agent_can_update_content_with_google_drive_urls(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $token = $user->createToken('test-agent', ['*'])->plainTextToken;

        $business = Business::create([
            'name' => 'Burger House',
            'slug' => 'burger-house',
            'monthly_retainer' => 20000,
        ]);

        $content = ContentItem::create([
            'business_id' => $business->id,
            'owner_id' => $user->id,
            'title' => 'Summer Promo Video',
            'type' => 'video',
            'stage' => 'planned',
        ]);

        $driveFolder = 'https://drive.google.com/drive/folders/shots-2026-summer-promo';
        $rawFootage = 'https://drive.google.com/drive/folders/shots-2026-summer-promo-raw';
        $finalAsset = 'https://drive.google.com/file/d/final-4k-render.mp4/view';

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/v1/content/{$content->id}", [
                'stage' => 'shot',
                'drive_folder_url' => $driveFolder,
                'raw_footage_url' => $rawFootage,
                'final_asset_url' => $finalAsset,
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.stage', 'shot')
            ->assertJsonPath('data.drive_folder_url', $driveFolder)
            ->assertJsonPath('data.raw_footage_url', $rawFootage)
            ->assertJsonPath('data.final_asset_url', $finalAsset);

        $this->assertDatabaseHas('content_items', [
            'id' => $content->id,
            'stage' => 'shot',
            'drive_folder_url' => $driveFolder,
            'raw_footage_url' => $rawFootage,
            'final_asset_url' => $finalAsset,
        ]);
    }

    public function test_authenticated_agent_can_manage_tasks_and_log_progress(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $token = $user->createToken('test-agent', ['*'])->plainTextToken;

        $task = Task::create([
            'created_by' => $user->id,
            'owner_id' => $user->id,
            'title' => 'Render 9:16 export',
            'type' => 'editing',
            'status' => 'todo',
            'priority' => 'high',
            'estimate_minutes' => 60,
        ]);

        // Agent moves task to in_progress
        $response1 = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/v1/tasks/{$task->id}", [
                'status' => 'in_progress',
            ]);

        $response1->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        // Agent completes task and logs actual minutes
        $response2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/v1/tasks/{$task->id}", [
                'status' => 'done',
                'actual_minutes' => 45,
            ]);

        $response2->assertOk()
            ->assertJsonPath('data.status', 'done')
            ->assertJsonPath('data.actual_minutes', 45);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'done',
            'actual_minutes' => 45,
        ]);
    }

    public function test_authenticated_agent_can_create_and_update_shoot_sessions_with_drive(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $token = $user->createToken('test-agent', ['*'])->plainTextToken;

        $business = Business::create([
            'name' => 'Steakhouse VIP',
            'slug' => 'steakhouse-vip',
            'monthly_retainer' => 50000,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/shoots', [
                'business_id' => $business->id,
                'title' => 'Steakhouse VIP Commercial Shoot',
                'starts_at' => now()->addDays(2)->format('Y-m-d H:i:s'),
                'location' => 'Downtown Rooftop',
                'notes' => '1. Ribeye sizzle 2. Chef plating 3. Cocktail pour',
                'drive_folder_url' => 'https://drive.google.com/drive/folders/steakhouse-shoot-feb',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.location', 'Downtown Rooftop')
            ->assertJsonPath('data.drive_folder_url', 'https://drive.google.com/drive/folders/steakhouse-shoot-feb');

        $shootId = $response->json('data.id');

        // Update shoot session status after filming
        $updateResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/v1/shoots/{$shootId}", [
                'status' => 'completed',
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseHas('shoot_sessions', [
            'id' => $shootId,
            'status' => 'completed',
            'drive_folder_url' => 'https://drive.google.com/drive/folders/steakhouse-shoot-feb',
        ]);
    }

    public function test_web_settings_can_generate_api_tokens(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        // Generate token
        $response = $this->actingAs($owner)
            ->from('/settings/integrations')
            ->post('/settings/api-tokens', [
                'name' => 'Autonomous Marketing Bot',
            ]);

        $response->assertRedirect('/settings/integrations');
        $response->assertSessionHas('newApiToken');

        /** @var array{name: string, token: string, expires_at: ?string} $newApiToken */
        $newApiToken = session('newApiToken');
        $this->assertNotNull($newApiToken);
        $plainTextToken = $newApiToken['token'];
        $this->assertStringContainsString('|', $plainTextToken);

        $this->assertDatabaseCount('personal_access_tokens', 1);
        $tokenRecord = $owner->tokens()->first();
        $this->assertNotNull($tokenRecord);
        $this->assertEquals('Autonomous Marketing Bot', $tokenRecord->name);

        // Verify that this token works on the API
        $this->withHeader('Authorization', "Bearer {$plainTextToken}")
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('user.email', $owner->email);
    }

    public function test_web_settings_can_revoke_api_tokens(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $owner->createToken('Autonomous Marketing Bot');
        $tokenRecord = $owner->tokens()->first();
        $this->assertNotNull($tokenRecord);

        // Revoke token via web settings
        $revokeResponse = $this->actingAs($owner)
            ->from('/settings/integrations')
            ->delete("/settings/api-tokens/{$tokenRecord->id}");

        $revokeResponse->assertRedirect('/settings/integrations');
        $revokeResponse->assertSessionHas('success');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_revoked_token_is_rejected_by_api(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $token = $owner->createToken('Revoked Agent Token')->plainTextToken;
        $tokenId = $owner->tokens()->first()->id;

        // Revoke token
        $owner->tokens()->where('id', $tokenId)->delete();

        // Verify that the revoked token can no longer access the API
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/user')
            ->assertUnauthorized();
    }

    public function test_agent_can_create_shoot_with_auto_extracted_broll_tags_and_query_by_tag(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $token = $owner->createToken('Autonomous Marketing Bot')->plainTextToken;

        $business = Business::create([
            'name' => 'Lumink Cafe',
            'slug' => 'lumink-cafe',
            'monthly_retainer' => 30000,
        ]);

        // 1. Create a shoot session where agent provides rich notes, letting the system auto-extract b-roll tags
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/shoots', [
                'business_id' => $business->id,
                'title' => 'Espresso Extraction & Latte Art Slow-Mo Shoot',
                'location' => 'Main Downtown Branch Espresso Bar',
                'starts_at' => now()->addDays(2)->toDateTimeString(),
                'status' => 'scheduled',
                'notes' => 'Captured 4K 120fps steam wand texture, grinder pour, and espresso extraction.',
                'footage_summary' => 'Close-up macro lens shots of roasted beans and barista latte art swirl.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'Espresso Extraction & Latte Art Slow-Mo Shoot');

        $shootId = $response->json('data.id');
        $shoot = ShootSession::find($shootId);
        $this->assertNotNull($shoot);
        $this->assertIsArray($shoot->broll_tags);
        $this->assertContains('espresso', $shoot->broll_tags);
        $this->assertContains('latte', $shoot->broll_tags);

        // 2. Query shoots filtering by tag
        $queryResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/shoots?business_id={$business->id}&tag=latte");

        $queryResponse->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $shootId);

        // Search with non-matching tag should return 0
        $missResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/shoots?business_id={$business->id}&tag=nonexistenttagxyz");

        $missResponse->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_agent_can_plan_content_referencing_shoots_and_task_contains_footage(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $token = $owner->createToken('Autonomous Marketing Bot')->plainTextToken;

        $business = Business::create([
            'name' => 'Burger Lab',
            'slug' => 'burger-lab',
            'monthly_retainer' => 45000,
        ]);

        // Create past shoot (B-roll library)
        $pastShoot = ShootSession::create([
            'business_id' => $business->id,
            'title' => 'Kitchen Sizzle & Grill Master B-Roll',
            'starts_at' => now()->subDays(5),
            'status' => 'completed',
            'drive_folder_url' => 'https://drive.google.com/drive/folders/shoots-archive-grill-sizzle',
            'broll_tags' => ['sizzle', 'grill', 'patty', 'flame'],
            'footage_summary' => 'Close up flame broiling and searing patties.',
        ]);

        // Create main shoot session
        $mainShoot = ShootSession::create([
            'business_id' => $business->id,
            'title' => 'Chef Tasting Table Shoot',
            'starts_at' => now()->addDays(1),
            'status' => 'scheduled',
            'drive_folder_url' => 'https://drive.google.com/drive/folders/shoots-archive-chef-table',
            'broll_tags' => ['chef', 'tasting', 'table'],
        ]);

        // Agent creates content referencing primary shoot and past b-roll shoot, with editing task
        $contentResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/content', [
                'business_id' => $business->id,
                'title' => 'The Perfect Patty Sizzle Reel',
                'type' => 'reel',
                'stage' => 'planned',
                'primary_shoot_id' => $mainShoot->id,
                'referenced_shoot_ids' => [$pastShoot->id],
                'tasks' => [
                    [
                        'title' => 'Edit 30s Reel using Sizzle B-Roll and Chef Tasting',
                        'type' => 'video_editing',
                        'priority' => 'high',
                        'estimate_minutes' => 90,
                    ],
                ],
            ]);

        $contentResponse->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.primary_shoot_id', $mainShoot->id)
            ->assertJsonPath('data.drive_folder_url', 'https://drive.google.com/drive/folders/shoots-archive-chef-table')
            ->assertJsonPath('data.primary_shoot.id', $mainShoot->id)
            ->assertJsonPath('data.referenced_shoots.0.id', $pastShoot->id);

        $createdContent = ContentItem::find($contentResponse->json('data.id'));
        $this->assertNotNull($createdContent);
        $task = $createdContent->tasks()->first();
        $this->assertNotNull($task);

        // Fetch task via editor API endpoint
        $taskResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/tasks/{$task->id}");

        $taskResponse->assertOk()
            ->assertJsonPath('data.id', $task->id)
            ->assertJsonPath('data.content_item.primary_shoot.drive_folder_url', 'https://drive.google.com/drive/folders/shoots-archive-chef-table')
            ->assertJsonPath('data.content_item.referenced_shoots.0.drive_folder_url', 'https://drive.google.com/drive/folders/shoots-archive-grill-sizzle');
    }
}

