<?php

namespace App\Policies;

use App\Models\Business;
use App\Models\User;

class BusinessPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canManageOperations();
    }

    public function view(User $user, Business $business): bool
    {
        return $user->canManageOperations();
    }

    public function create(User $user): bool
    {
        return $user->canManageOperations();
    }

    public function update(User $user, Business $business): bool
    {
        return $user->canManageOperations();
    }

    public function delete(User $user, Business $business): bool
    {
        return $user->canManageOperations();
    }

    public function restore(User $user, Business $business): bool
    {
        return $user->canManageOperations();
    }

    public function forceDelete(User $user, Business $business): bool
    {
        return $user->isOwner();
    }
}
