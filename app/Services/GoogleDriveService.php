<?php

namespace App\Services;

use App\Models\Business;
use App\Models\DriveConnection;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleDriveService
{
    public function request(DriveConnection $connection): PendingRequest
    {
        if ($connection->expires_at?->isPast() && $connection->refresh_token) {
            $this->refresh($connection);
        }

        return Http::withToken($connection->access_token)
            ->acceptJson()
            ->timeout(15);
    }

    public function provisionBusiness(DriveConnection $connection, Business $business): string
    {
        $parent = $connection->root_folder_id ?: config('services.google_drive.folder_id');
        $businessFolder = $this->createFolder($connection, $business->name, $parent);

        foreach (['Campaigns', 'Raw footage', 'Working files', 'Approved exports', 'Reports and invoices'] as $folder) {
            $this->createFolder($connection, $folder, $businessFolder);
        }

        $business->update([
            'drive_folder_id' => $businessFolder,
            'drive_folder_url' => "https://drive.google.com/drive/folders/{$businessFolder}",
        ]);

        return $businessFolder;
    }

    private function createFolder(DriveConnection $connection, string $name, ?string $parent = null): string
    {
        $payload = [
            'name' => $name,
            'mimeType' => 'application/vnd.google-apps.folder',
        ];

        if ($parent) {
            $payload['parents'] = [$parent];
        }

        $response = $this->request($connection)
            ->post('https://www.googleapis.com/drive/v3/files?fields=id', $payload)
            ->throw()
            ->json();

        return $response['id'] ?? throw new RuntimeException('Google Drive did not return a folder ID.');
    }

    private function refresh(DriveConnection $connection): void
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $connection->refresh_token,
            'grant_type' => 'refresh_token',
        ])->throw()->json();

        $connection->update([
            'access_token' => $response['access_token'],
            'expires_at' => now()->addSeconds((int) ($response['expires_in'] ?? 3600)),
        ]);
    }
}
