<?php

namespace App\Http\Controllers;

use App\Mail\TeamInvitationMail;
use App\Models\AuditEvent;
use App\Models\Invitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class InvitationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:manager,specialist'],
        ]);

        $invitation = Invitation::updateOrCreate(
            ['email' => strtolower($data['email'])],
            ['role' => $data['role'], 'invited_by' => $request->user()->id, 'accepted_at' => null],
        );

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'invitation.created',
            'auditable_type' => Invitation::class,
            'auditable_id' => $invitation->id,
            'metadata' => ['email' => $invitation->email, 'role' => $invitation->role],
        ]);

        try {
            Mail::to($invitation->email)->send(new TeamInvitationMail($invitation));
        } catch (\Exception $e) {
            Log::error('Failed to send invitation email: ' . $e->getMessage());
            return back()->with('error', 'Access authorized, but we could not send the invitation email. Please notify them manually.');
        }

        return back()->with('success', 'Access authorized and invitation email sent.');
    }

    public function resend(Request $request, Invitation $invitation): RedirectResponse
    {
        $invitation->update([
            'accepted_at' => null,
            'updated_at' => now(),
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'invitation.resent',
            'auditable_type' => Invitation::class,
            'auditable_id' => $invitation->id,
            'metadata' => ['email' => $invitation->email],
        ]);

        try {
            Mail::to($invitation->email)->send(new TeamInvitationMail($invitation));
        } catch (\Exception $e) {
            Log::error('Failed to resend invitation email: ' . $e->getMessage());
            return back()->with('error', 'Invitation refreshed, but email could not be dispatched.');
        }

        return back()->with('success', "Invitation resent to {$invitation->email}.");
    }

    public function destroy(Request $request, Invitation $invitation): RedirectResponse
    {
        $email = $invitation->email;
        $id = $invitation->id;

        $invitation->delete();

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'event' => 'invitation.revoked',
            'auditable_type' => Invitation::class,
            'auditable_id' => $id,
            'metadata' => ['email' => $email],
        ]);

        return back()->with('success', "Invitation for {$email} has been revoked.");
    }
}

