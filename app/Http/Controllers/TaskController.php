<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Task;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskStatusChanged;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create', Task::class), 403);

        try {
            $data = $request->validate([
                'title' => ['required', 'string', 'max:180'],
                'business_id' => ['nullable', 'exists:businesses,id'],
                'content_item_id' => ['nullable', 'exists:content_items,id'],
                'owner_id' => ['nullable', 'exists:users,id'],
                'type' => ['required', 'string', 'max:50'],
                'priority' => ['required', 'in:low,medium,high'],
                'due_at' => ['nullable', 'date'],
                'estimate_minutes' => ['nullable', 'integer', 'min:0'],
                'description' => ['nullable', 'string'],
            ]);
        } catch (ValidationException $e) {
            \Log::error('Task creation validation failed', $e->errors());
            throw $e;
        }

        $task = Task::create([
            ...$data,
            'created_by' => $request->user()->id,
            'status' => 'todo',
        ]);

        if ($task->owner_id && $task->owner_id !== $request->user()->id) {
            $task->owner->notify(new TaskAssigned($task, $request->user()->name));
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'task.created',
            'auditable_type' => Task::class,
            'auditable_id' => $task->id,
            'metadata' => ['title' => $task->title],
        ]);

        return back();
    }

    public function update(Request $request, Task $task): RedirectResponse
    {
        abort_unless($request->user()->can('update', $task), 403);

        $data = $request->validate([
            'status' => ['sometimes', 'in:todo,in_progress,blocked,review,done'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'owner_id' => ['sometimes', 'nullable', 'exists:users,id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'actual_minutes' => ['sometimes', 'integer', 'min:0'],
        ]);

        $oldStatus = $task->status;
        $oldOwnerId = $task->owner_id;
        $task->update($data);

        if (isset($data['owner_id']) && $data['owner_id'] !== $oldOwnerId && $data['owner_id'] !== $request->user()->id) {
            if ($task->owner) {
                $task->owner->notify(new TaskAssigned($task, $request->user()->name));
            }
        }

        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            $usersToNotify = collect();
            if ($task->owner_id && $task->owner_id !== $request->user()->id) {
                $usersToNotify->push($task->owner);
            }
            if ($task->created_by && $task->created_by !== $request->user()->id) {
                $usersToNotify->push($task->creator);
            }
            $usersToNotify->filter()->unique('id')->each(function ($user) use ($task, $request) {
                $user->notify(new TaskStatusChanged($task, $task->status, $request->user()->name));
            });
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'task.updated',
            'auditable_type' => Task::class,
            'auditable_id' => $task->id,
            'metadata' => $data,
        ]);

        return back();
    }
}
