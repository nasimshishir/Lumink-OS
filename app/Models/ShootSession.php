<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $business_id
 * @property int|null $campaign_id
 * @property int|null $owner_id
 * @property string $title
 * @property string|null $location
 * @property string|null $drive_folder_url
 * @property array<string>|null $broll_tags
 * @property string|null $footage_summary
 * @property Carbon $starts_at
 * @property Carbon|null $ends_at
 * @property string $status
 * @property string|null $notes
 * @property-read Business|null $business
 * @property-read Campaign|null $campaign
 * @property-read User|null $owner
 */
class ShootSession extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'broll_tags' => 'array',
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

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return HasMany<ContentItem, $this> */
    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class, 'primary_shoot_id');
    }

    /**
     * Helper to extract clean searchable tags from shot lists or notes.
     *
     * @return array<string>
     */
    public static function extractTagsFromText(?string $text): array
    {
        if (empty($text)) {
            return [];
        }

        $stopwords = [
            'the', 'and', 'with', 'for', 'from', 'this', 'that', 'have', 'were', 'shot', 'shots',
            'take', 'takes', 'taking', 'into', 'over', 'some', 'more', 'about', 'after', 'before',
            'will', 'when', 'what', 'which', 'where', 'also', 'just', 'need', 'there',
        ];

        // Clean text and split words
        $words = preg_split('/[\s,\.\;\:\-\(\)\[\]\/]+/', strtolower($text)) ?: [];

        $tags = [];
        foreach ($words as $word) {
            $word = trim($word);
            if (strlen($word) >= 3 && ! in_array($word, $stopwords, true) && ! is_numeric($word)) {
                $tags[$word] = true;
            }
        }

        return array_slice(array_keys($tags), 0, 15);
    }
}
