<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Task;
use App\Notifications\TaskAssigned;

class NotificationController extends Controller
{
    public function markAsRead(Request $request, string $id): RedirectResponse
    {
        $notification = $request->user()->unreadNotifications()->findOrFail($id);
        $notification->markAsRead();

        $link = $notification->data['link'] ?? null;
        if ($link) {
            return redirect($link);
        }

        return back();
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();
        return back();
    }

    /**
     * Helper to run migrations and seed test notifications.
     */
    public function devMigrate(Request $request): RedirectResponse
    {
        abort_unless(app()->isLocal(), 403);

        // Run migrations
        Artisan::call('migrate');

        // Seed some dummy notifications for the current authenticated user
        $user = $request->user();
        if ($user) {
            // Clear existing first to make it clean
            $user->notifications()->delete();

            // Create a fake task for illustration if one doesn't exist
            $task = Task::first();
            if (!$task) {
                $task = Task::create([
                    'title' => 'Sample Shoot Editing',
                    'type' => 'editing',
                    'priority' => 'high',
                    'status' => 'todo',
                ]);
            }

            // Send dynamic notifications
            $user->notify(new TaskAssigned($task, 'Nasim Shishir'));

            // Directly insert another fake notification into database to have variety
            $user->notifications()->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'type' => 'App\Notifications\ApprovalResponded',
                'data' => [
                    'title' => 'Content Review Update',
                    'description' => 'Client "Fresh & Juicy" approved "Summer Campaign Reel v1"',
                    'link' => '/content',
                ],
            ]);

            $user->notifications()->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'type' => 'App\Notifications\ApprovalResponded',
                'data' => [
                    'title' => 'Content Review Update',
                    'description' => 'Client "Zaitoon" requested changes on "Biryani Promo Post"',
                    'link' => '/content',
                ],
                'read_at' => now(), // already read
            ]);
        }

        return redirect()->route('today')->with('success', 'Migrations executed and test notifications seeded successfully!');
    }
}
