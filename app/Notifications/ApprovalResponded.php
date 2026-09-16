<?php

namespace App\Notifications;

use App\Models\ApprovalRequest;
use App\Models\ApprovalResponse;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ApprovalResponded extends Notification
{
    use Queueable;

    public function __construct(
        public ApprovalRequest $request,
        public ApprovalResponse $response
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $contentTitle = $this->request->contentItem->title;
        $actionText = $this->response->action === 'approved' ? 'approved' : 'requested changes on';

        return [
            'title' => 'Content Review Update',
            'description' => "Client \"{$this->response->client_name}\" has {$actionText} \"{$contentTitle}\"",
            'link' => "/content/{$this->request->content_item_id}",
            'content_item_id' => $this->request->content_item_id,
        ];
    }
}
