<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\ShootSession;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    protected function createBusiness(string $name = 'Acme Corp'): Business
    {
        return Business::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
            'monthly_retainer' => 25000,
        ]);
    }

    public function test_guest_cannot_access_calendar(): void
    {
        $this->get('/calendar')->assertRedirect('/login');
    }

    public function test_owner_can_view_all_unified_calendar_events(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = $this->createBusiness();

        Task::create([
            'business_id' => $business->id,
            'title' => 'Deliver final edit',
            'type' => 'editing',
            'status' => 'in_progress',
            'priority' => 'high',
            'due_at' => Carbon::now()->addDays(2),
        ]);

        ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Product Launch Reel',
            'type' => 'reel',
            'stage' => 'shoot_scheduled',
            'priority' => 'high',
            'publish_at' => Carbon::now()->addDays(4),
        ]);

        ShootSession::create([
            'business_id' => $business->id,
            'title' => 'Studio Lifestyle Shoot',
            'location' => 'Studio 4, Dhaka',
            'starts_at' => Carbon::now()->addDays(3),
            'status' => 'scheduled',
        ]);

        $this->actingAs($owner)
            ->get('/calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('calendar/index')
                ->has('events', 3)
                ->has('businesses')
                ->has('calendarFeedUrl')
                ->where('isManager', true)
            );
    }

    public function test_specialist_only_views_assigned_events(): void
    {
        $specialist = User::factory()->create(['role' => 'specialist']);
        $otherUser = User::factory()->create(['role' => 'specialist']);
        $business = $this->createBusiness();

        // Assigned to specialist
        Task::create([
            'business_id' => $business->id,
            'owner_id' => $specialist->id,
            'title' => 'Specialist Task',
            'due_at' => Carbon::now()->addDays(1),
        ]);

        // Assigned to someone else
        Task::create([
            'business_id' => $business->id,
            'owner_id' => $otherUser->id,
            'title' => 'Other Task',
            'due_at' => Carbon::now()->addDays(2),
        ]);

        $this->actingAs($specialist)
            ->get('/calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('calendar/index')
                ->has('events', 1)
                ->where('isManager', false)
            );
    }

    public function test_authenticated_user_can_export_ics_file(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $business = $this->createBusiness();

        Task::create([
            'business_id' => $business->id,
            'title' => 'Quarterly Planning',
            'due_at' => Carbon::now()->addDays(1),
        ]);

        $response = $this->actingAs($user)->get('/calendar/export');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/calendar; charset=utf-8');
        $this->assertStringContainsString('BEGIN:VCALENDAR', $response->getContent());
        $this->assertStringContainsString('SUMMARY:[TASK] Quarterly Planning', $response->getContent());
        $this->assertStringContainsString('END:VCALENDAR', $response->getContent());
    }

    public function test_public_feed_endpoint_serves_ics_with_valid_token(): void
    {
        $user = User::factory()->create(['role' => 'owner']);
        $token = $user->getCalendarToken();
        $business = $this->createBusiness();

        ContentItem::create([
            'business_id' => $business->id,
            'title' => 'Autumn Campaign Video',
            'publish_at' => Carbon::now()->addDays(5),
            'stage' => 'scheduled',
        ]);

        $response = $this->get("/calendar/feed/{$token}.ics");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/calendar; charset=utf-8');
        $this->assertStringContainsString('BEGIN:VCALENDAR', $response->getContent());
        $this->assertStringContainsString('SUMMARY:[CONTENT] Autumn Campaign Video', $response->getContent());
    }

    public function test_public_feed_returns_404_for_invalid_token(): void
    {
        $this->get('/calendar/feed/invalid-non-existent-token.ics')->assertNotFound();
    }

    public function test_user_can_regenerate_calendar_token(): void
    {
        $user = User::factory()->create();
        $oldToken = $user->getCalendarToken();

        $this->actingAs($user)
            ->post('/calendar/regenerate-token')
            ->assertRedirect();

        $this->assertNotEquals($oldToken, $user->fresh()->calendar_token);
    }
}
