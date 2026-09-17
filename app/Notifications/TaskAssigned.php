<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    public function __construct(
        public Task $task,
        public string $assignerName
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string|int> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New Task Assigned',
            'description' => "{$this->assignerName} assigned you: \"{$this->task->title}\"",
            'link' => '/my-work',
            'task_id' => $this->task->id,
        ];
    }
}
