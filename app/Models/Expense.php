<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['spent_on' => 'date', 'amount' => 'decimal:2'];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
