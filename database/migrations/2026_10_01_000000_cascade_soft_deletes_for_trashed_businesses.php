<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $trashedBusinesses = DB::table('businesses')
            ->whereNotNull('deleted_at')
            ->get(['id', 'deleted_at']);

        foreach ($trashedBusinesses as $business) {
            $deletedAt = $business->deleted_at ?? now();

            DB::table('tasks')
                ->where('business_id', $business->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $deletedAt]);

            DB::table('content_items')
                ->where('business_id', $business->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $deletedAt]);

            DB::table('invoices')
                ->where('business_id', $business->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $deletedAt]);

            DB::table('expenses')
                ->where('business_id', $business->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $deletedAt]);
        }
    }

    public function down(): void
    {
        // No-op rollback to preserve soft-delete integrity
    }
};
