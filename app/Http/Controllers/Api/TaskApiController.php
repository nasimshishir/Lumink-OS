<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskApiController extends Controller
{
    /**
     * List tasks with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Task::query()
            ->with([
                'business:id,name,slug,drive_folder_url,drive_folders_map',
                'contentItem' => fn ($q) => $q->select(['id', 'title', 'type', 'stage', 'drive_folder_url', 'raw_footage_url', 'final_asset_url', 'primary_shoot_id', 'referenced_shoot_ids'])
                    ->with('primaryShoot:id,title,starts_at,location,drive_folder_url'),
                'owner:id,name',
            ])
            ->where(fn ($q) => $q->whereNull('business_id')->orWhereHas('business'));

        if ($request->filled('business_id')) {
            $query->where('business_id', $request->integer('business_id'));
        }

        if ($request->filled('content_item_id')) {
            $query->where('content_item_id', $request->integer('content_item_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('owner_id')) {
            $query->where('owner_id', $request->integer('owner_id'));
        }

        $tasks = $query->orderByRaw('due_at is null, due_at asc')->paginate(40);

        return response()->json([
            'status' => 'success',
            'data' => $tasks->items(),
            'pagination' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    /**
     * Create a task for content or operations.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['nullable', 'exists:businesses,id'],
            'content_item_id' => ['nullable', 'exists:content_items,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'type' => ['sometimes', 'required', 'string', 'max:50'],
            'status' => ['sometimes', 'required', Rule::in(['todo', 'in_progress', 'blocked', 'review', 'done'])],
            'priority' => ['sometimes', 'required', Rule::in(['low', 'medium', 'high'])],
            'starts_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'estimate_minutes' => ['nullable', 'integer', 'min:0'],
            'actual_minutes' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = $request->user();

        $task = Task::create([
            ...$data,
            'type' => $data['type'] ?? 'content',
            'status' => $data['status'] ?? 'todo',
            'priority' => $data['priority'] ?? 'medium',
            'owner_id' => $data['owner_id'] ?? $user->id,
            'created_by' => $user->id,
        ]);

        AuditEvent::create([
            'user_id' => $user->id,
            'event' => 'task.created_via_agent',
            'auditable_type' => Task::class,
            'auditable_id' => $task->id,
            'metadata' => ['title' => $task->title],
        ]);

        $task->load(['business:id,name,slug', 'contentItem:id,title']);

        return response()->json([
            'status' => 'success',
            'message' => 'Task created successfully.',
            'data' => $task,
        ], 201);
    }

    /**
     * Get specific task details.
     */
    public function show(Request $request, Task $task): JsonResponse
    {
        abort_if($task->trashed(), 404, 'Task is in Recycle Bin.');

        $task->load([
            'business:id,name,slug,drive_folder_url,drive_folders_map',
            'contentItem' => fn ($q) => $q->select(['id', 'title', 'type', 'stage', 'drive_folder_url', 'raw_footage_url', 'final_asset_url', 'primary_shoot_id', 'referenced_shoot_ids'])
                ->with('primaryShoot:id,title,starts_at,location,drive_folder_url'),
            'owner:id,name',
        ]);

        $taskData = $task->toArray();
        if ($task->contentItem) {
            $taskData['content_item']['referenced_shoots'] = $task->contentItem->referencedShoots();
        }

        return response()->json([
            'status' => 'success',
            'data' => $taskData,
        ]);
    }

    /**
     * Update task status, actual minutes, estimate, or details.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        abort_if($task->trashed(), 404, 'Task is in Recycle Bin.');

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'type' => ['sometimes', 'required', 'string', 'max:50'],
            'status' => ['sometimes', 'required', Rule::in(['todo', 'in_progress', 'blocked', 'review', 'done'])],
            'priority' => ['sometimes', 'required', Rule::in(['low', 'medium', 'high'])],
            'starts_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'estimate_minutes' => ['nullable', 'integer', 'min:0'],
            'actual_minutes' => ['nullable', 'integer', 'min:0'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'business_id' => ['nullable', 'exists:businesses,id'],
            'content_item_id' => ['nullable', 'exists:content_items,id'],
        ]);

        $oldStatus = $task->status;
        $task->update($data);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'task.updated_via_agent',
            'auditable_type' => Task::class,
            'auditable_id' => $task->id,
            'metadata' => [
                'status_change' => isset($data['status']) && $data['status'] !== $oldStatus ? ['from' => $oldStatus, 'to' => $data['status']] : null,
                'updated_fields' => array_keys($data),
            ],
        ]);

        $task->load(['business:id,name,slug', 'contentItem:id,title']);

        return response()->json([
            'status' => 'success',
            'message' => 'Task updated successfully.',
            'data' => $task,
        ]);
    }

    /**
     * Soft delete task.
     */
    public function destroy(Request $request, Task $task): JsonResponse
    {
        abort_if($task->trashed(), 404, 'Task is already in Recycle Bin.');

        $title = $task->title;
        $task->delete();

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'task.trashed_via_agent',
            'auditable_type' => Task::class,
            'auditable_id' => $task->id,
            'metadata' => ['title' => $title],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Task '{$title}' moved to Recycle Bin.",
        ]);
    }
}
