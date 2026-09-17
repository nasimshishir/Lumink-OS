<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $business_id
 * @property string $number
 * @property string $status
 * @property Carbon $issue_date
 * @property Carbon $due_date
 * @property string $total
 * @property-read float $paid_amount
 * @property-read float $balance
 * @property-read string $effective_status
 * @property-read Collection<int, Payment> $payments
 */
class Invoice extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return HasMany<InvoiceLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->payments->sum('amount');
    }

    public function getBalanceAttribute(): float
    {
        return max(0, (float) $this->total - (float) $this->payments()->sum('amount'));
    }

    public function getEffectiveStatusAttribute(): string
    {
        if (in_array($this->status, ['cancelled', 'paid'], true)) {
            return $this->status;
        }

        if ($this->balance <= 0) {
            return 'paid';
        }

        if ($this->due_date->isPast()) {
            return 'overdue';
        }

        return $this->paid_amount > 0 ? 'partial' : 'sent';
    }

    public function syncPaymentStatus(): void
    {
        if ($this->status === 'cancelled') {
            return;
        }

        $this->update(['status' => $this->effective_status]);
    }
}
