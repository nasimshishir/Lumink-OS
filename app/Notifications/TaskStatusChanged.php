<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        public Task $task,
        public string $status,
        public string $actorName
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string|int> */
    public function toArray(object $notifiable): array
    {
        $statusText = str_replace('_', ' ', $this->status);

        return [
            'title' => 'Task Status Updated',
            'description' => "\"{$this->actorName}\" changed task \"{$this->task->title}\" status to ".ucfirst($statusText),
            'link' => '/my-work',
            'task_id' => $this->task->id,
        ];
    }
}
