<?php

namespace App\Notifications;

use App\Models\ContentItem;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ContentStageChanged extends Notification
{
    use Queueable;

    public function __construct(
        public ContentItem $contentItem,
        public string $stage,
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
        return [
            'title' => 'Content Stage Updated',
            'description' => "\"{$this->actorName}\" changed stage of \"{$this->contentItem->title}\" to ".ucfirst($this->stage),
            'link' => "/content/{$this->contentItem->id}",
            'content_item_id' => $this->contentItem->id,
        ];
    }
}
