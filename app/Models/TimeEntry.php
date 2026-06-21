<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['worked_on' => 'date'];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
