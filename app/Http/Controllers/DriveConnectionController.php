<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\DriveConnection;
use App\Services\GoogleDriveService;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class DriveConnectionController extends Controller
{
    public function redirect(): SymfonyRedirectResponse|RedirectResponse
    {
        return Socialite::driver('google')
            ->redirectUrl(route('drive.callback'))
            ->scopes(['https://www.googleapis.com/auth/drive.file'])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')
            ->redirectUrl(route('drive.callback'))
            ->user();

        DriveConnection::updateOrCreate(
            ['user_id' => request()->user()->id],
            [
                'google_email' => $googleUser->getEmail(),
                'access_token' => $googleUser->token,
                'refresh_token' => $googleUser->refreshToken,
                'expires_at' => now()->addSeconds((int) ($googleUser->expiresIn ?? 3600)),
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
}
