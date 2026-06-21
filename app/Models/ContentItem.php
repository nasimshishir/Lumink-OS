<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentItem extends Model
{
    public const STAGES = [
        'idea',
        'planned',
        'scripted',
        'shoot_scheduled',
        'shot',
        'editing',
        'internal_review',
        'client_review',
        'approved',
        'scheduled',
        'published',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'featured_items' => 'array',
            'publish_at' => 'datetime',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function platformVersions(): HasMany
    {
        return $this->hasMany(PlatformVersion::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalRequest::class);
    }
}
