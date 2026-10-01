<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

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
 * @property-read Collection<int, ContentStepProof> $proofs
 * @property-read Collection<int, ContentInspiration> $inspirations
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

    /** @return HasMany<ContentStepProof, $this> */
    public function proofs(): HasMany
    {
        return $this->hasMany(ContentStepProof::class);
    }

    /** @return HasMany<ContentInspiration, $this> */
    public function inspirations(): HasMany
    {
        return $this->hasMany(ContentInspiration::class)->orderBy('position')->latest();
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

    /**
     * Normalize and attach an inspiration reference to this content deliverable.
     *
     * @param  array<string, mixed>|string  $raw
     */
    public function attachInspiration(array|string $raw, ?int $userId = null, int $position = 0): ?ContentInspiration
    {
        $url = null;
        $imageUrl = null;
        $title = null;
        $notes = null;
        $type = null;
        $tags = null;

        if (is_string($raw)) {
            $trimmed = trim($raw);
            if ($trimmed === '') {
                return null;
            }

            if (filter_var($trimmed, FILTER_VALIDATE_URL) || preg_match('#^https?://#i', $trimmed)) {
                $url = $trimmed;
            } else {
                $notes = $trimmed;
            }
        } else {
            $url = isset($raw['url']) && is_string($raw['url']) ? trim($raw['url']) : (isset($raw['link']) && is_string($raw['link']) ? trim($raw['link']) : null);
            $imageUrl = isset($raw['image_url']) && is_string($raw['image_url']) ? trim($raw['image_url']) : (isset($raw['image']) && is_string($raw['image']) ? trim($raw['image']) : null);
            $notes = isset($raw['notes']) && is_string($raw['notes']) ? trim($raw['notes']) : (isset($raw['note']) && is_string($raw['note']) ? trim($raw['note']) : (isset($raw['description']) && is_string($raw['description']) ? trim($raw['description']) : null));
            $title = isset($raw['title']) && is_string($raw['title']) ? trim($raw['title']) : (isset($raw['name']) && is_string($raw['name']) ? trim($raw['name']) : null);
            $type = isset($raw['type']) && is_string($raw['type']) ? trim($raw['type']) : null;

            if (isset($raw['tags'])) {
                if (is_array($raw['tags'])) {
                    $tags = array_values(array_filter(array_map('strval', $raw['tags'])));
                } elseif (is_string($raw['tags'])) {
                    $tagList = array_filter(array_map('trim', explode(',', $raw['tags'])));
                    $tags = ! empty($tagList) ? array_values($tagList) : null;
                }
            }

            if (isset($raw['position']) && is_numeric($raw['position'])) {
                $position = (int) $raw['position'];
            }
        }

        // Derive title if missing
        if (empty($title)) {
            if (! empty($notes)) {
                $firstLine = trim(explode("\n", $notes)[0]);
                $title = Str::limit($firstLine, 60);
            } elseif (! empty($url)) {
                $host = parse_url($url, PHP_URL_HOST);
                if (is_string($host) && $host !== '') {
                    $cleanHost = preg_replace('/^www\./', '', $host);
                    $title = $cleanHost ? ucfirst($cleanHost).' Reference' : 'Web Reference';
                } else {
                    $title = 'Web Reference';
                }
            } elseif (! empty($imageUrl)) {
                $title = 'Image Moodboard Reference';
            } else {
                $title = 'Inspiration Reference';
            }
        }

        // Derive type if missing or invalid
        $validTypes = ['link', 'image', 'video', 'note'];
        if (empty($type) || ! in_array($type, $validTypes, true)) {
            $targetUrl = $url ?: $imageUrl;
            if ($imageUrl || ($targetUrl && preg_match('/\.(jpe?g|png|webp|gif|svg|avif)(?:\?.*)?$/i', $targetUrl))) {
                $type = 'image';
            } elseif ($targetUrl && preg_match('/(?:youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|\/reels?\/|\/shorts\/)/i', $targetUrl)) {
                $type = 'video';
            } elseif (! empty($url)) {
                $type = 'link';
            } else {
                $type = 'note';
            }
        }

        // If type is image and image_url is missing but url is provided
        if ($type === 'image' && ! $imageUrl && $url) {
            $imageUrl = $url;
        }

        /** @var ContentInspiration $inspiration */
        $inspiration = $this->inspirations()->create([
            'user_id' => $userId,
            'title' => $title,
            'type' => $type,
            'url' => $url,
            'image_url' => $imageUrl,
            'notes' => $notes,
            'tags' => $tags,
            'position' => $position,
        ]);

        return $inspiration;
    }
}
