<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\DriveConnection;
use App\Services\GoogleDriveService;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as SocialiteUser;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class DriveConnectionController extends Controller
{
    public function redirect(): SymfonyRedirectResponse|RedirectResponse
    {
        return $this->googleProvider()
            ->redirectUrl(route('drive.callback'))
            ->scopes(['https://www.googleapis.com/auth/drive.file'])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        $googleUser = $this->googleProvider()
            ->redirectUrl(route('drive.callback'))
            ->user();

        if (! $googleUser instanceof SocialiteUser) {
            throw new LogicException('Google did not return an OAuth 2 user.');
        }

        DriveConnection::updateOrCreate(
            ['user_id' => request()->user()->id],
            [
                'google_email' => $googleUser->getEmail(),
                'access_token' => $googleUser->token,
                'refresh_token' => $googleUser->refreshToken,
                'expires_at' => now()->addSeconds($googleUser->expiresIn),
                'root_folder_id' => config('services.google_drive.folder_id'),
            ],
        );

        return to_route('integrations.index')->with('success', 'Google Drive connected.');
    }

    public function provision(Business $business, GoogleDriveService $drive): RedirectResponse
    {
        $connection = DriveConnection::where('user_id', request()->user()->id)->firstOrFail();
        $drive->provisionBusiness($connection, $business);

        return back()->with('success', 'Business Drive folders created.');
    }

    public function destroy(): RedirectResponse
    {
        DriveConnection::where('user_id', request()->user()->id)->delete();

        return back()->with('success', 'Google Drive disconnected.');
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
