<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $business_id
 * @property int|null $campaign_id
 * @property int|null $owner_id
 * @property int|null $primary_shoot_id
 * @property array<int>|null $referenced_shoot_ids
 * @property string $title
 * @property string $type
 * @property string $stage
 * @property string $priority
 * @property string|null $brief
 * @property string|null $drive_folder_url
 * @property string|null $raw_footage_url
 * @property string|null $final_asset_url
 * @property Carbon|null $publish_at
 * @property int $revision_number
 * @property Carbon|null $deleted_at
 * @property-read User|null $owner
 * @property-read Business|null $business
 * @property-read ShootSession|null $primaryShoot
 */
class ContentItem extends Model
{
    use SoftDeletes;

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
            'referenced_shoot_ids' => 'array',
            'publish_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class)->withTrashed();
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /** @return BelongsTo<ShootSession, $this> */
    public function primaryShoot(): BelongsTo
    {
        return $this->belongsTo(ShootSession::class, 'primary_shoot_id');
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return HasMany<PlatformVersion, $this> */
    public function platformVersions(): HasMany
    {
        return $this->hasMany(PlatformVersion::class);
    }

    /** @return HasMany<Task, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /** @return HasMany<ApprovalRequest, $this> */
    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalRequest::class);
    }

    /**
     * Retrieve referenced shoot sessions.
     *
     * @return Collection<int, ShootSession>
     */
    public function referencedShoots(): Collection
    {
        if (empty($this->referenced_shoot_ids)) {
            return new Collection;
        }

        return ShootSession::whereIn('id', $this->referenced_shoot_ids)
            ->get(['id', 'title', 'starts_at', 'location', 'drive_folder_url', 'broll_tags', 'footage_summary']);
    }
}
