<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\ContentItem;
use App\Models\ShootSession;
use App\Models\Task;
use App\Models\User;
use App\Services\CalendarFeedService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $events = $this->getUnifiedEvents($user);
        $businesses = Business::select('id', 'name')->orderBy('name')->get();
        $teamMembers = $user->canManageOperations()
            ? User::select('id', 'name', 'avatar')->where('is_active', true)->orderBy('name')->get()
            : [];

        $token = $user->getCalendarToken();
        $feedUrl = route('calendar.feed', ['token' => $token]);
        $webcalUrl = preg_replace('/^https?:\/\//i', 'webcal://', $feedUrl) ?? $feedUrl;

        $tasks = Task::with('business:id,name')
            ->when(! $user->canManageOperations(), fn ($query) => $query->where('owner_id', $user->id))
            ->whereNotNull('due_at')
            ->orderBy('due_at')
            ->get();

        return Inertia::render('calendar/index', [
            'events' => $events,
            'tasks' => $tasks,
            'businesses' => $businesses,
            'teamMembers' => $teamMembers,
            'calendarFeedUrl' => $feedUrl,
            'webcalFeedUrl' => $webcalUrl,
            'calendarToken' => $token,
            'isManager' => $user->canManageOperations(),
        ]);
    }

    public function export(Request $request, CalendarFeedService $feedService): HttpResponse
    {
        $events = $this->getUnifiedEvents($request->user());
        $icsContent = $feedService->generateIcs($events, 'Lumink OS - '.$request->user()->name);

        return response($icsContent, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="lumink-schedule.ics"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    public function feed(string $token, CalendarFeedService $feedService): HttpResponse
    {
        $user = User::query()
            ->where('calendar_token', $token)
            ->where('is_active', true)
            ->firstOrFail();

        $events = $this->getUnifiedEvents($user);
        $icsContent = $feedService->generateIcs($events, 'Lumink OS - '.$user->name);

        return response($icsContent, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="lumink-feed.ics"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    public function regenerateToken(Request $request): RedirectResponse
    {
        $request->user()->regenerateCalendarToken();

        return back()->with('success', 'Calendar subscription URL has been regenerated.');
    }

    /**
     * Aggregate and normalize events across Tasks, ContentItems, and ShootSessions.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function getUnifiedEvents(User $user): array
    {
        $canManage = $user->canManageOperations();

        // 1. Scheduled Tasks
        $tasks = Task::with(['business:id,name', 'owner:id,name,avatar'])
            ->when(! $canManage, fn ($q) => $q->where('owner_id', $user->id))
            ->whereNotNull('due_at')
            ->orderBy('due_at')
            ->get();

        /** @var array<int, array<string, mixed>> $allEvents */
        $allEvents = [];

        foreach ($tasks as $task) {
            $allEvents[] = [
                'id' => "task-{$task->id}",
                'raw_id' => $task->id,
                'title' => $task->title,
                'event_type' => 'task',
                'date' => $task->due_at?->toIso8601String(),
                'start_date' => $task->starts_at?->toIso8601String(),
                'end_date' => $task->due_at?->toIso8601String(),
                'status' => $task->status,
                'priority' => $task->priority,
                'sub_type' => $task->type,
                'business' => $task->business ? [
                    'id' => $task->business->id,
                    'name' => $task->business->name,
                ] : null,
                'owner' => $task->owner ? [
                    'id' => $task->owner->id,
                    'name' => $task->owner->name,
                    'avatar' => $task->owner->avatar,
                ] : null,
                'description' => $task->description,
                'url' => $task->business ? "/businesses/{$task->business->id}" : '/my-work',
            ];
        }

        // 2. Scheduled Content Deliverables
        $contentItems = ContentItem::with(['business:id,name', 'owner:id,name,avatar'])
            ->when(! $canManage, fn ($q) => $q->where('owner_id', $user->id))
            ->whereNotNull('publish_at')
            ->orderBy('publish_at')
            ->get();

        foreach ($contentItems as $item) {
            $allEvents[] = [
                'id' => "content-{$item->id}",
                'raw_id' => $item->id,
                'title' => $item->title,
                'event_type' => 'content',
                'date' => $item->publish_at?->toIso8601String(),
                'start_date' => null,
                'end_date' => $item->publish_at?->toIso8601String(),
                'status' => $item->stage,
                'priority' => $item->priority,
                'sub_type' => $item->type,
                'business' => $item->business ? [
                    'id' => $item->business->id,
                    'name' => $item->business->name,
                ] : null,
                'owner' => $item->owner ? [
                    'id' => $item->owner->id,
                    'name' => $item->owner->name,
                    'avatar' => $item->owner->avatar,
                ] : null,
                'description' => $item->brief,
                'url' => "/content/{$item->id}",
            ];
        }

        // 3. Shoot Sessions
        $shoots = ShootSession::with(['business:id,name', 'owner:id,name,avatar'])
            ->when(! $canManage, fn ($q) => $q->where('owner_id', $user->id))
            ->whereNotNull('starts_at')
            ->orderBy('starts_at')
            ->get();

        foreach ($shoots as $shoot) {
            $allEvents[] = [
                'id' => "shoot-{$shoot->id}",
                'raw_id' => $shoot->id,
                'title' => $shoot->title,
                'event_type' => 'shoot',
                'date' => $shoot->starts_at->toIso8601String(),
                'start_date' => $shoot->starts_at->toIso8601String(),
                'end_date' => $shoot->ends_at?->toIso8601String() ?? $shoot->starts_at->copy()->addHours(2)->toIso8601String(),
                'status' => $shoot->status,
                'priority' => 'high',
                'sub_type' => 'shoot_session',
                'business' => $shoot->business ? [
                    'id' => $shoot->business->id,
                    'name' => $shoot->business->name,
                ] : null,
                'owner' => $shoot->owner ? [
                    'id' => $shoot->owner->id,
                    'name' => $shoot->owner->name,
                    'avatar' => $shoot->owner->avatar,
                ] : null,
                'location' => $shoot->location,
                'description' => ($shoot->location ? "Location: {$shoot->location}\n" : '').($shoot->notes ?? ''),
                'url' => $shoot->business ? "/businesses/{$shoot->business->id}" : '/calendar',
            ];
        }

        usort($allEvents, function (array $a, array $b) {
            $dateA = ! empty($a['date']) ? Carbon::parse($a['date'])->getTimestamp() : 0;
            $dateB = ! empty($b['date']) ? Carbon::parse($b['date'])->getTimestamp() : 0;

            return $dateA <=> $dateB;
        });

        return $allEvents;
    }
}
