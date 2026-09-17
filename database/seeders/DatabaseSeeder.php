<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
