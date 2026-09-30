<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ApiTokenController extends Controller
{
    /**
     * Generate a new API access token for an AI Agent or integration.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isOwner() || $user->canManageOperations(), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'abilities' => ['nullable', 'array'],
            'expires_in_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ]);

        $abilities = $data['abilities'] ?? ['*'];
        $expiresAt = ! empty($data['expires_in_days']) ? now()->addDays($data['expires_in_days']) : null;

        $token = $user->createToken($data['name'], $abilities, $expiresAt);

        return back()->with([
            'success' => "API Token '{$data['name']}' created successfully.",
            'newApiToken' => [
                'name' => $data['name'],
                'token' => $token->plainTextToken,
                'expires_at' => $expiresAt?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Revoke an API access token.
     */
    public function destroy(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isOwner() || $user->canManageOperations(), 403);

        $user->tokens()->where('id', $id)->delete();

        return back()->with('success', 'API Token revoked.');
    }
}
