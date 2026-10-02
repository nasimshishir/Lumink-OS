<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ClientApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_inviting_a_client_requires_a_valid_business_id(): void
    {
        $owner = User::factory()->create(['role' => 'owner', 'is_active' => true]);
        $business = Business::create([
            'name' => 'Burger House',
            'slug' => 'burger-house',
            'monthly_retainer' => 5000,
        ]);

        // Attempting to invite client without business_id fails
        $this->actingAs($owner)
            ->post('/invitations', [
                'email' => 'client@burgerhouse.com',
                'role' => 'client',
            ])
            ->assertSessionHasErrors('business_id');

        // Inviting client with valid business_id succeeds
        $this->actingAs($owner)
            ->post('/invitations', [
                'email' => 'client@burgerhouse.com',
                'role' => 'client',
                'business_id' => $business->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('invitations', [
            'email' => 'client@burgerhouse.com',
            'role' => 'client',
            'business_id' => $business->id,
            'invited_by' => $owner->id,
        ]);
    }

    public function test_google_login_completion_for_invited_client_sets_business_and_redirects_to_approvals(): void
    {
        $business = Business::create([
            'name' => 'Coffee Roasters',
            'slug' => 'coffee-roasters',
            'monthly_retainer' => 3000,
        ]);

        $clientUser = User::factory()->create([
            'name' => 'Client User',
            'email' => 'client@coffeeroasters.com',
            'role' => 'client',
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        Cache::put('google-login:client-token', $clientUser->id, now()->addMinutes(5));

        $response = $this->get(route('auth.google.complete', [
            'token' => 'client-token',
        ]));

        $response->assertRedirect(route('approvals.index'));
        $this->assertAuthenticatedAs($clientUser);
    }

    public function test_clients_are_redirected_from_dashboard_to_approvals(): void
    {
        $business = Business::create([
            'name' => 'Taco Bar',
            'slug' => 'taco-bar',
            'monthly_retainer' => 4000,
        ]);

        $client = User::factory()->create([
            'role' => 'client',
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        $this->actingAs($client)
            ->get(route('today'))
            ->assertRedirect(route('approvals.index'));
    }

    public function test_client_only_sees_deliverables_for_their_assigned_business(): void
    {
        $businessA = Business::create([
            'name' => 'Business A',
            'slug' => 'business-a',
            'monthly_retainer' => 5000,
        ]);

        $businessB = Business::create([
            'name' => 'Business B',
            'slug' => 'business-b',
            'monthly_retainer' => 5000,
        ]);

        $clientA = User::factory()->create([
            'role' => 'client',
            'business_id' => $businessA->id,
            'is_active' => true,
        ]);

        $itemA = ContentItem::create([
            'business_id' => $businessA->id,
            'title' => 'Business A Reel',
            'type' => 'reel',
            'stage' => 'client_review',
            'revision_number' => 1,
        ]);

        $itemB = ContentItem::create([
            'business_id' => $businessB->id,
            'title' => 'Business B Reel',
            'type' => 'reel',
            'stage' => 'client_review',
            'revision_number' => 1,
        ]);

        $response = $this->actingAs($clientA)
            ->get(route('approvals.index'))
            ->assertOk();

        $pending = $response->viewData('page')['props']['pendingItems'];
        $pendingIds = collect($pending)->pluck('id')->all();

        $this->assertContains($itemA->id, $pendingIds);
        $this->assertNotContains($itemB->id, $pendingIds);
    }

    public function test_client_can_approve_deliverable_in_system(): void
    {
        $business = Business::create([
            'name' => 'Pizzeria',
            'slug' => 'pizzeria',
            'monthly_retainer' => 6000,
        ]);

        $client = User::factory()->create([
            'name' => 'Mario',
            'role' => 'client',
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Pizza Launch Promo',
            'type' => 'cinematic',
            'stage' => 'client_review',
            'revision_number' => 1,
        ]);

        $this->actingAs($client)
            ->post("/content/{$content->id}/approve", [
                'action' => 'approved',
                'comment' => 'Looks amazing!',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('content_items', [
            'id' => $content->id,
            'stage' => 'approved',
            'revision_number' => 1,
        ]);

        $this->assertDatabaseHas('approval_responses', [
            'client_name' => 'Mario',
            'action' => 'approved',
            'comment' => 'Looks amazing!',
        ]);
    }

    public function test_client_can_request_changes_in_system(): void
    {
        $business = Business::create([
            'name' => 'Bakery',
            'slug' => 'bakery',
            'monthly_retainer' => 3500,
        ]);

        $client = User::factory()->create([
            'name' => 'Sarah',
            'role' => 'client',
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        $content = ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Croissant Carousel',
            'type' => 'carousel',
            'stage' => 'client_review',
            'revision_number' => 1,
        ]);

        $this->actingAs($client)
            ->post("/content/{$content->id}/approve", [
                'action' => 'changes_requested',
                'comment' => 'Please make the font bigger on slide 2.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('content_items', [
            'id' => $content->id,
            'stage' => 'editing',
            'revision_number' => 2,
        ]);

        $this->assertDatabaseHas('approval_responses', [
            'client_name' => 'Sarah',
            'action' => 'changes_requested',
            'comment' => 'Please make the font bigger on slide 2.',
        ]);
    }

    public function test_client_cannot_approve_content_of_another_business(): void
    {
        $businessA = Business::create([
            'name' => 'Business A',
            'slug' => 'business-a',
            'monthly_retainer' => 5000,
        ]);

        $businessB = Business::create([
            'name' => 'Business B',
            'slug' => 'business-b',
            'monthly_retainer' => 5000,
        ]);

        $clientA = User::factory()->create([
            'role' => 'client',
            'business_id' => $businessA->id,
            'is_active' => true,
        ]);

        $contentB = ContentItem::create([
            'business_id' => $businessB->id,
            'title' => 'Other Business Promo',
            'stage' => 'client_review',
            'revision_number' => 1,
        ]);

        $this->actingAs($clientA)
            ->post("/content/{$contentB->id}/approve", [
                'action' => 'approved',
            ])
            ->assertForbidden();
    }

    public function test_client_is_blocked_from_internal_agency_areas(): void
    {
        $business = Business::create([
            'name' => 'Boutique',
            'slug' => 'boutique',
            'monthly_retainer' => 4500,
        ]);

        $client = User::factory()->create([
            'role' => 'client',
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        $this->actingAs($client)->get('/finance')->assertForbidden();
        $this->actingAs($client)->get('/team')->assertForbidden();
        $this->actingAs($client)->get('/roles')->assertForbidden();
        $this->actingAs($client)->get('/recycle-bin')->assertForbidden();
    }
}
