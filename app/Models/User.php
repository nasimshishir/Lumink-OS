<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property string|null $google_id
 * @property string|null $avatar
 * @property string $role
 * @property bool $is_active
 * @property string|null $calendar_token
 */
#[Fillable(['name', 'email', 'password', 'google_id', 'avatar', 'role', 'is_active', 'calendar_token'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected $attributes = [
        'is_active' => true,
        'role' => 'specialist',
    ];

    protected static function booted(): void
    {
        static::saved(function (User $user) {
            if ($user->role && ($user->wasChanged('role') || ! $user->roles()->exists())) {
                $role = Role::firstOrCreate(['name' => $user->role, 'guard_name' => 'web']);
                $user->syncRoles([$role]);
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner' || $this->hasRole('owner');
    }

    public function canManageOperations(): bool
    {
        return in_array($this->role, ['owner', 'manager'], true)
            || $this->hasAnyRole(['owner', 'manager'])
            || $this->can('businesses.view');
    }

    public function getCalendarToken(): string
    {
        if (empty($this->calendar_token)) {
            return $this->regenerateCalendarToken();
        }

        return $this->calendar_token;
    }

    public function regenerateCalendarToken(): string
    {
        $token = Str::random(48);
        $this->forceFill(['calendar_token' => $token])->save();

        return $token;
    }
}
