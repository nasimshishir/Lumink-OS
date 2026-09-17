<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property int $id */
class Campaign extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'featured_items' => 'array',
            'starts_on' => 'date',
            'ends_on' => 'date',
            'budget' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return HasMany<ContentItem, $this> */
    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }
}
