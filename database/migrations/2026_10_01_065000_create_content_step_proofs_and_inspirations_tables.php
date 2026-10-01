<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_step_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('stage')->index();
            $table->string('status')->default('verified')->index();
            $table->string('proof_url', 1000)->nullable();
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['content_item_id', 'stage']);
        });

        Schema::create('content_inspirations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type')->default('link');
            $table->string('title');
            $table->string('url', 1000)->nullable();
            $table->string('image_path', 1000)->nullable();
            $table->string('image_url', 1000)->nullable();
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_inspirations');
        Schema::dropIfExists('content_step_proofs');
    }
};
