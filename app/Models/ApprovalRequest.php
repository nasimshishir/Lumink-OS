<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $content_item_id
 * @property int|null $created_by
 * @property string $token
 * @property string $status
 * @property int $version
 * @property Carbon $expires_at
 * @property Carbon|null $revoked_at
 * @property Carbon|null $responded_at
 * @property-read ContentItem $contentItem
 * @property-read User|null $creator
 */
class ApprovalRequest extends Model
{
    protected $guarded = [];

    protected $hidden = ['token'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ContentItem, $this> */
    public function contentItem(): BelongsTo
    {
        return $this->belongsTo(ContentItem::class);
    }

    /** @return HasMany<ApprovalResponse, $this> */
    public function responses(): HasMany
    {
        return $this->hasMany(ApprovalResponse::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
