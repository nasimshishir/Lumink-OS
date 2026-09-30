<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shoot_sessions', function (Blueprint $table) {
            $table->json('broll_tags')->nullable()->after('drive_folder_url');
            $table->text('footage_summary')->nullable()->after('broll_tags');
        });

        Schema::table('content_items', function (Blueprint $table) {
            $table->foreignId('primary_shoot_id')->nullable()->after('drive_folder_url')->constrained('shoot_sessions')->nullOnDelete();
            $table->json('referenced_shoot_ids')->nullable()->after('primary_shoot_id');
        });

        Schema::table('businesses', function (Blueprint $table) {
            $table->json('drive_folders_map')->nullable()->after('drive_folder_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn(['drive_folders_map']);
        });

        Schema::table('content_items', function (Blueprint $table) {
            $table->dropForeign(['primary_shoot_id']);
            $table->dropColumn(['primary_shoot_id', 'referenced_shoot_ids']);
        });

        Schema::table('shoot_sessions', function (Blueprint $table) {
            $table->dropColumn(['broll_tags', 'footage_summary']);
        });
    }
};
