<?php

namespace App\Services;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\DriveConnection;
use App\Models\ShootSession;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class GoogleDriveService
{
    public function getActiveConnection(): ?DriveConnection
    {
        return DriveConnection::latest()->first();
    }

    public function request(DriveConnection $connection): PendingRequest
    {
        if ($connection->expires_at?->isPast() && $connection->refresh_token) {
            $this->refresh($connection);
        }

        return Http::withToken($connection->access_token)
            ->acceptJson()
            ->timeout(15);
    }

    /**
     * Set up the standardized 5-tier Google Drive directory structure for a business.
     */
    public function provisionBusiness(DriveConnection $connection, Business $business): string
    {
        $parent = $connection->root_folder_id ?: config('services.google_drive.folder_id');
        $businessFolder = $this->createFolder($connection, $business->name, $parent);

        // Tier 1: Raw Footage and subdirectories
        $rawFootageFolder = $this->createFolder($connection, '01_Raw_Footage', $businessFolder);
        $shootsArchiveFolder = $this->createFolder($connection, 'Shoots_Archive', $rawFootageFolder);
        $contentSpecificFolder = $this->createFolder($connection, 'Content_Specific', $rawFootageFolder);

        // Tier 2: Working Files
        $workingFilesFolder = $this->createFolder($connection, '02_Working_Files', $businessFolder);

        // Tier 3: Deliverables Review (for client preview exports)
        $deliverablesReviewFolder = $this->createFolder($connection, '03_Deliverables_Review', $businessFolder);

        // Tier 4: Master Approved Vault
        $approvedVaultFolder = $this->createFolder($connection, '04_Final_Approved_Vault', $businessFolder);

        // Tier 5: Brand Kit
        $brandKitFolder = $this->createFolder($connection, '05_Brand_Kit', $businessFolder);

        $foldersMap = [
            'root' => [
                'id' => $businessFolder,
                'url' => "https://drive.google.com/drive/folders/{$businessFolder}",
            ],
            'raw_footage' => [
                'id' => $rawFootageFolder,
                'url' => "https://drive.google.com/drive/folders/{$rawFootageFolder}",
            ],
            'shoots_archive' => [
                'id' => $shootsArchiveFolder,
                'url' => "https://drive.google.com/drive/folders/{$shootsArchiveFolder}",
            ],
            'content_specific' => [
                'id' => $contentSpecificFolder,
                'url' => "https://drive.google.com/drive/folders/{$contentSpecificFolder}",
            ],
            'working_files' => [
                'id' => $workingFilesFolder,
                'url' => "https://drive.google.com/drive/folders/{$workingFilesFolder}",
            ],
            'deliverables_review' => [
                'id' => $deliverablesReviewFolder,
                'url' => "https://drive.google.com/drive/folders/{$deliverablesReviewFolder}",
            ],
            'final_approved' => [
                'id' => $approvedVaultFolder,
                'url' => "https://drive.google.com/drive/folders/{$approvedVaultFolder}",
            ],
            'brand_kit' => [
                'id' => $brandKitFolder,
                'url' => "https://drive.google.com/drive/folders/{$brandKitFolder}",
            ],
        ];

        $business->update([
            'drive_folder_id' => $businessFolder,
            'drive_folder_url' => "https://drive.google.com/drive/folders/{$businessFolder}",
            'drive_folders_map' => $foldersMap,
        ]);

        return $businessFolder;
    }

    /**
     * Automatically create a dedicated shoot folder in Google Drive: 01_Raw_Footage/Shoots_Archive/YYYY-MM-DD - Title
     */
    public function provisionShootFolder(DriveConnection $connection, ShootSession $shoot): ?string
    {
        try {
            $business = $shoot->business;
            if (! $business || ! $business->drive_folder_id) {
                return null;
            }

            // Find parent Shoots_Archive folder
            $driveFoldersMap = is_array($business->drive_folders_map) ? $business->drive_folders_map : [];
            $shootsArchiveId = null;
            if (isset($driveFoldersMap['shoots_archive']) && is_array($driveFoldersMap['shoots_archive']) && ! empty($driveFoldersMap['shoots_archive']['id'])) {
                $shootsArchiveId = (string) $driveFoldersMap['shoots_archive']['id'];
            }

            if (! $shootsArchiveId) {
                // If not mapped, create under business folder
                $rawFootageFolder = $this->createFolder($connection, '01_Raw_Footage', $business->drive_folder_id);
                $shootsArchiveId = $this->createFolder($connection, 'Shoots_Archive', $rawFootageFolder);

                $map = $driveFoldersMap;
                $map['raw_footage'] = ['id' => $rawFootageFolder, 'url' => "https://drive.google.com/drive/folders/{$rawFootageFolder}"];
                $map['shoots_archive'] = ['id' => $shootsArchiveId, 'url' => "https://drive.google.com/drive/folders/{$shootsArchiveId}"];
                $business->update(['drive_folders_map' => $map]);
            }

            $datePrefix = $shoot->starts_at->format('Y-m-d');
            $folderName = "{$datePrefix} - {$shoot->title}";

            $shootFolderId = $this->createFolder($connection, $folderName, $shootsArchiveId);
            $driveUrl = "https://drive.google.com/drive/folders/{$shootFolderId}";

            $shoot->update(['drive_folder_url' => $driveUrl]);

            return $driveUrl;
        } catch (Throwable $e) {
            Log::warning("Could not auto-provision Google Drive shoot folder: {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Automatically create a deliverable-specific folder in Google Drive: 01_Raw_Footage/Content_Specific/[C-ID] Title
     */
    public function provisionContentFolder(DriveConnection $connection, ContentItem $content): ?string
    {
        try {
            $business = $content->business;
            if (! $business || ! $business->drive_folder_id) {
                return null;
            }

            $driveFoldersMap = is_array($business->drive_folders_map) ? $business->drive_folders_map : [];
            $contentSpecificId = null;
            if (isset($driveFoldersMap['content_specific']) && is_array($driveFoldersMap['content_specific']) && ! empty($driveFoldersMap['content_specific']['id'])) {
                $contentSpecificId = (string) $driveFoldersMap['content_specific']['id'];
            }

            if (! $contentSpecificId) {
                $rawFootageFolder = $this->createFolder($connection, '01_Raw_Footage', $business->drive_folder_id);
                $contentSpecificId = $this->createFolder($connection, 'Content_Specific', $rawFootageFolder);

                $map = $driveFoldersMap;
                $map['raw_footage'] = ['id' => $rawFootageFolder, 'url' => "https://drive.google.com/drive/folders/{$rawFootageFolder}"];
                $map['content_specific'] = ['id' => $contentSpecificId, 'url' => "https://drive.google.com/drive/folders/{$contentSpecificId}"];
                $business->update(['drive_folders_map' => $map]);
            }

            $folderName = "[C-{$content->id}] {$content->title}";
            $folderId = $this->createFolder($connection, $folderName, $contentSpecificId);
            $driveUrl = "https://drive.google.com/drive/folders/{$folderId}";

            $content->update(['drive_folder_url' => $driveUrl]);

            return $driveUrl;
        } catch (Throwable $e) {
            Log::warning("Could not auto-provision Google Drive content folder: {$e->getMessage()}");

            return null;
        }
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
