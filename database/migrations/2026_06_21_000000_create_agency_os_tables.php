<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('role')->default('specialist')->index();
            $table->boolean('is_active')->default(true);
        });

        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('role')->default('specialist');
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('status')->default('active')->index();
            $table->string('industry')->default('Restaurant');
            $table->string('logo_url')->nullable();
            $table->string('primary_contact_name')->nullable();
            $table->string('primary_contact_email')->nullable();
            $table->string('primary_contact_phone')->nullable();
            $table->json('platforms')->nullable();
            $table->json('brand_profile')->nullable();
            $table->string('drive_folder_id')->nullable();
            $table->string('drive_folder_url')->nullable();
            $table->decimal('monthly_retainer', 12, 2)->default(0);
            $table->date('agreement_start')->nullable();
            $table->date('agreement_end')->nullable();
            $table->unsignedTinyInteger('billing_day')->default(1);
            $table->unsignedTinyInteger('approval_deadline_hours')->default(24);
            $table->unsignedTinyInteger('revision_limit')->default(2);
            $table->json('deliverable_targets')->nullable();
            $table->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('status')->default('active')->index();
            $table->text('objective')->nullable();
            $table->text('target_audience')->nullable();
            $table->text('offer')->nullable();
            $table->json('featured_items')->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->decimal('budget', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('content_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('type')->default('reel');
            $table->string('stage')->default('idea')->index();
            $table->string('priority')->default('medium')->index();
            $table->text('brief')->nullable();
            $table->text('hook')->nullable();
            $table->text('script')->nullable();
            $table->text('cta')->nullable();
            $table->text('target_audience')->nullable();
            $table->json('featured_items')->nullable();
            $table->text('shoot_notes')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->timestamp('publish_at')->nullable()->index();
            $table->unsignedInteger('revision_number')->default(1);
            $table->timestamps();
        });

        Schema::create('platform_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained()->cascadeOnDelete();
            $table->string('platform');
            $table->text('caption')->nullable();
            $table->string('format')->nullable();
            $table->string('status')->default('draft');
            $table->timestamp('publish_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['content_item_id', 'platform']);
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('content_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->default('general');
            $table->string('status')->default('todo')->index();
            $table->string('priority')->default('medium')->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('due_at')->nullable()->index();
            $table->unsignedInteger('estimate_minutes')->default(0);
            $table->unsignedInteger('actual_minutes')->default(0);
            $table->json('recurrence')->nullable();
            $table->timestamps();
        });

        Schema::create('task_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->boolean('is_complete')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('minutes');
            $table->text('note')->nullable();
            $table->date('worked_on');
            $table->timestamps();
        });

        Schema::create('shoot_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('location')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('token')->unique();
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('version');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('approval_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $table->string('client_name');
            $table->string('action');
            $table->text('comment')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique();
            $table->string('status')->default('draft')->index();
            $table->date('issue_date');
            $table->date('due_date');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total', 12, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('paid_on');
            $table->string('method')->nullable();
            $table->string('reference')->nullable();
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('content_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('allocation_type')->default('overhead')->index();
            $table->string('category')->index();
            $table->string('vendor')->nullable();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->date('spent_on')->index();
            $table->string('payment_method')->nullable();
            $table->string('receipt_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('performance_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->decimal('sales_change_percent', 7, 2)->nullable();
            $table->string('baseline_label')->nullable();
            $table->json('metrics')->nullable();
            $table->text('notes')->nullable();
            $table->text('next_actions')->nullable();
            $table->timestamps();
        });

        Schema::create('drive_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('content_item_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('drive_id');
            $table->string('name');
            $table->string('type')->default('file');
            $table->string('url')->nullable();
            $table->string('mime_type')->nullable();
            $table->timestamps();
        });

        Schema::create('drive_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('google_email');
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('root_folder_id')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event');
            $table->nullableMorphs('auditable');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('drive_connections');
        Schema::dropIfExists('drive_resources');
        Schema::dropIfExists('performance_periods');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_lines');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('approval_responses');
        Schema::dropIfExists('approval_requests');
        Schema::dropIfExists('shoot_sessions');
        Schema::dropIfExists('time_entries');
        Schema::dropIfExists('task_checklist_items');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('platform_versions');
        Schema::dropIfExists('content_items');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('businesses');
        Schema::dropIfExists('invitations');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_id', 'avatar', 'role', 'is_active']);
        });
    }
};
