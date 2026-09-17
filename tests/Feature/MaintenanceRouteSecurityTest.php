<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaintenanceRouteSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_reset_route_is_not_exposed(): void
    {
        $this->get('/clear-db-temp')->assertNotFound();
    }

    public function test_development_migration_route_is_not_exposed(): void
    {
        $user = User::factory()->create(['role' => 'owner']);

        $this->actingAs($user)->get('/dev/migrate')->assertNotFound();
    }
}
