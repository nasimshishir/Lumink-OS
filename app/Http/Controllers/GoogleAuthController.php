<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleAuthController extends Controller
{
    public function redirect(): SymfonyRedirectResponse|RedirectResponse
    {
        $state = Crypt::encryptString(json_encode([
            'expires_at' => now()->addMinutes(10)->timestamp,
            'nonce' => Str::random(40),
        ], JSON_THROW_ON_ERROR));

        return $this->googleProvider()
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $this->validateState($request);

        $googleUser = $this->googleProvider()->stateless()->user();
        $googleEmail = $googleUser->getEmail();
        abort_unless(is_string($googleEmail) && $googleEmail !== '', 403, 'Google did not provide an email address.');
        $email = strtolower($googleEmail);

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $invitation = Invitation::where('email', $email)->whereNull('accepted_at')->first();
            abort_unless($invitation !== null, 403, 'This Google account has not been invited.');

            $user = User::create([
                'name' => $googleUser->getName(),
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'role' => $invitation->role,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $invitation->update(['accepted_at' => now()]);
        }

        abort_unless($user->is_active, 403, 'This Google account is disabled.');

        $user->update([
            'google_id' => $googleUser->getId(),
            'avatar' => $googleUser->getAvatar(),
            'email_verified_at' => now(),
            'password' => $user->password ?: Hash::make(Str::random(40)),
        ]);

        $token = Str::random(64);

        Cache::put("google-login:{$token}", $user->id, now()->addMinutes(5));

        return redirect()->away(
            rtrim(config('app.url'), '/').'/auth/google/complete?'.http_build_query([
                'token' => $token,
            ]),
        );
    }

    public function complete(Request $request): RedirectResponse
    {
        $token = (string) $request->query('token');

        abort_if($token === '', 403, 'Google sign-in token is missing.');

        $userId = Cache::pull("google-login:{$token}");

        abort_unless(is_int($userId) || (is_string($userId) && ctype_digit($userId)), 403, 'Google sign-in token is invalid or expired.');

        $user = User::query()->findOrFail((int) $userId);

        abort_unless($user->is_active, 403, 'This Google account is disabled.');

        Auth::login($user, true);
        $request->session()->regenerate();

        AuditEvent::create([
            'user_id' => $user->id,
            'event' => 'user.signed_in_with_google',
        ]);

        return redirect()->intended(route('today'));
    }

    private function validateState(Request $request): void
    {
        try {
            $state = json_decode(
                Crypt::decryptString((string) $request->query('state')),
                true,
                flags: JSON_THROW_ON_ERROR,
            );
        } catch (DecryptException|\JsonException) {
            abort(419, 'Google sign-in state is invalid.');
        }

        abort_unless(
            isset($state['expires_at'], $state['nonce'])
                && is_int($state['expires_at'])
                && is_string($state['nonce'])
                && $state['expires_at'] >= now()->timestamp,
            419,
            'Google sign-in state is invalid or expired.',
        );
    }

    private function googleProvider(): GoogleProvider
    {
        $provider = Socialite::driver('google');

        if (! $provider instanceof GoogleProvider) {
            throw new LogicException('The configured Google Socialite driver is invalid.');
        }

        return $provider;
    }
}
