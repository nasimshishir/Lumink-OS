<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('content_step_proofs')
            ->where('status', 'verified')
            ->update(['status' => 'completed']);

        Schema::table('content_step_proofs', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });
    }

    public function down(): void
    {
        DB::table('content_step_proofs')
            ->where('status', 'completed')
            ->update(['status' => 'verified']);

        Schema::table('content_step_proofs', function (Blueprint $table) {
            $table->string('status')->default('verified')->change();
        });
    }
};
