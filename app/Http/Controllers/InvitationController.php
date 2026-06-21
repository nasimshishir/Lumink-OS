<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:manager,specialist'],
        ]);

        Invitation::updateOrCreate(
            ['email' => strtolower($data['email'])],
            ['role' => $data['role'], 'invited_by' => $request->user()->id, 'accepted_at' => null],
        );

        return back()->with('success', 'Google account invited.');
    }
}
