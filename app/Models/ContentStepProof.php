<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $content_item_id
 * @property int|null $user_id
 * @property string $stage
 * @property string $status
 * @property string|null $proof_url
 * @property string|null $notes
 * @property array<array{name: string, url: string, path: string, size?: int, mime_type?: string}>|null $attachments
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $verified_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read ContentItem $contentItem
 * @property-read User|null $user
 */
class ContentStepProof extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'metadata' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ContentItem, $this> */
    public function contentItem(): BelongsTo
    {
        return $this->belongsTo(ContentItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
