<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformVersion extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'publish_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function contentItem(): BelongsTo
    {
        return $this->belongsTo(ContentItem::class);
    }
}
