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
        Schema::table('content_items', function (Blueprint $table) {
            $table->string('drive_folder_url', 1000)->nullable()->after('thumbnail_url');
            $table->string('raw_footage_url', 1000)->nullable()->after('drive_folder_url');
            $table->string('final_asset_url', 1000)->nullable()->after('raw_footage_url');
        });

        Schema::table('shoot_sessions', function (Blueprint $table) {
            $table->string('drive_folder_url', 1000)->nullable()->after('location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('content_items', function (Blueprint $table) {
            $table->dropColumn(['drive_folder_url', 'raw_footage_url', 'final_asset_url']);
        });

        Schema::table('shoot_sessions', function (Blueprint $table) {
            $table->dropColumn('drive_folder_url');
        });
    }
};
