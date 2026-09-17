<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeamMemberController extends Controller
{
    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        abort_if(
            $user->id === $request->user()->id,
            403,
            'You cannot deactivate your own account.'
        );

        if ($user->isOwner() && $user->is_active) {
            $remainingActiveOwners = User::query()
                ->where('role', 'owner')
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();

            abort_if(
                $remainingActiveOwners === 0,
                422,
                'Cannot deactivate the last remaining active owner.'
            );
        }

        $newStatus = ! $user->is_active;
        $user->update(['is_active' => $newStatus]);

        if (! $newStatus) {
            try {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            } catch (\Throwable $e) {
                // In case session driver is not database or table is missing
            }
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => $newStatus ? 'team_member.activated' : 'team_member.deactivated',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'metadata' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => $newStatus,
            ],
        ]);

        $statusLabel = $newStatus ? 'reactivated' : 'deactivated';

        return back()->with('success', "{$user->name} has been {$statusLabel}.");
    }
}
