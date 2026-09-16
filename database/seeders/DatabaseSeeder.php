<?php

namespace Database\Seeders;

use App\Models\ApprovalRequest;
use App\Models\Business;
use App\Models\Campaign;
use App\Models\ContentItem;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PerformancePeriod;
use App\Models\PlatformVersion;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $nasim = User::create([
            'name' => 'Nasim',
            'email' => 'nasim@luminkco.com',
            'password' => Hash::make('local-demo-password'),
            'role' => 'owner',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

    }
}
