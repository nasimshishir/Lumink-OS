<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $content_item_id
 * @property int|null $user_id
 * @property string $type
 * @property string $title
 * @property string|null $url
 * @property string|null $image_path
 * @property string|null $image_url
 * @property string|null $notes
 * @property array<string>|null $tags
 * @property int $position
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read ContentItem $contentItem
 * @property-read User|null $user
 */
class ContentInspiration extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'position' => 'integer',
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
