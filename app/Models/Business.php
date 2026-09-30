<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $status
 * @property string|null $drive_folder_id
 * @property array<string, mixed>|null $drive_folders_map
 * @property Carbon|null $deleted_at
 */
class Business extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'platforms' => 'array',
            'brand_profile' => 'array',
            'deliverable_targets' => 'array',
            'drive_folders_map' => 'array',
            'monthly_retainer' => 'decimal:2',
            'agreement_start' => 'date',
            'agreement_end' => 'date',
        ];
    }

    /** @return HasMany<Campaign, $this> */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /** @return HasMany<ContentItem, $this> */
    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }

    /** @return HasMany<Task, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /** @return HasMany<Invoice, $this> */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /** @return HasMany<Expense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /** @return HasMany<ShootSession, $this> */
    public function shootSessions(): HasMany
    {
        return $this->hasMany(ShootSession::class);
    }

    /** @return HasMany<PerformancePeriod, $this> */
    public function performancePeriods(): HasMany
    {
        return $this->hasMany(PerformancePeriod::class);
    }
}
