<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
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

        $task = Task::create([
            ...$data,
            'created_by' => $request->user()->id,
            'status' => 'todo',
        ]);

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
        abort_unless($request->user()->canManageOperations() || $task->owner_id === $request->user()->id, 403);

        $data = $request->validate([
            'status' => ['sometimes', 'in:todo,in_progress,blocked,review,done'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'owner_id' => ['sometimes', 'nullable', 'exists:users,id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'actual_minutes' => ['sometimes', 'integer', 'min:0'],
        ]);

        $task->update($data);

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
