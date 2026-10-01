<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Gate::before(function ($user, $ability) {
            return ($user->hasRole('owner') || $user->role === 'owner') ? true : null;
        });

        Sanctum::getAccessTokenFromRequestUsing(function (Request $request) {
            // 1. Try default bearer token
            $token = $request->bearerToken();

            // 2. Try raw Authorization header (handles missing 'Bearer ', 'Token ', or repeated 'Bearer Bearer ')
            if (! $token && $auth = $request->header('Authorization')) {
                $token = $auth;
            }

            // 3. Try server variables (for Apache FastCGI/PHP-FPM/LiteSpeed)
            if (! $token) {
                $token = $request->server('HTTP_AUTHORIZATION')
                    ?: $request->server('REDIRECT_HTTP_AUTHORIZATION')
                    ?: $request->server('REDIRECT_REDIRECT_HTTP_AUTHORIZATION');
            }

            // 4. Try apache_request_headers() if available
            if (! $token && function_exists('apache_request_headers')) {
                $apacheHeaders = apache_request_headers();
                $token = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? null;
            }

            // 5. Try custom headers that proxies and Apache NEVER strip
            if (! $token) {
                $token = $request->header('X-Api-Token')
                    ?: $request->header('X-Agent-Token')
                    ?: $request->header('X-API-Key')
                    ?: $request->header('Api-Token');
            }

            // 6. Try query string (?api_token=... or ?token=...)
            if (! $token) {
                $query = $request->query('api_token') ?: $request->query('token');
                if (is_string($query)) {
                    $token = $query;
                }
            }

            if (! is_string($token)) {
                return null;
            }

            // Clean token: strip surrounding quotes, any "Bearer" / "Token" prefixes, and whitespace
            $clean = trim($token, " \t\n\r\0\x0B\"'");
            $clean = (string) preg_replace('/^(?:Bearer|Token)\s+/i', '', $clean);
            $clean = (string) preg_replace('/^(?:Bearer|Token)\s+/i', '', $clean);
            $clean = trim($clean, " \t\n\r\0\x0B\"'");

            return $clean !== '' ? $clean : null;
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
