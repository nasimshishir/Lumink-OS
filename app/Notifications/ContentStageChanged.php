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

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Content Stage Updated',
            'description' => "\"{$this->actorName}\" changed stage of \"{$this->contentItem->title}\" to " . ucfirst($this->stage),
            'link' => "/content/{$this->contentItem->id}",
            'content_item_id' => $this->contentItem->id,
        ];
    }
}
