<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_valid_google_login_bridge_signs_the_user_into_the_herd_domain(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
        ]);

        Cache::put('google-login:valid-token', $user->id, now()->addMinutes(5));

        $response = $this->get(route('auth.google.complete', [
            'token' => 'valid-token',
        ]));

        $response->assertRedirect(route('today'));
        $this->assertAuthenticatedAs($user);
        $this->assertNull(Cache::get('google-login:valid-token'));
    }

    public function test_a_google_login_bridge_token_cannot_be_reused(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
        ]);

        Cache::put('google-login:one-time-token', $user->id, now()->addMinutes(5));

        $this->get(route('auth.google.complete', [
            'token' => 'one-time-token',
        ]))->assertRedirect(route('today'));

        auth()->logout();

        $this->get(route('auth.google.complete', [
            'token' => 'one-time-token',
        ]))->assertForbidden();
    }
}
