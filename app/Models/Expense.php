<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $allocation_type
 * @property string $category
 * @property string $amount
 */
class Expense extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['spent_on' => 'date', 'amount' => 'decimal:2'];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
