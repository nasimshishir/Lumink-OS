<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isOwner()) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        return $user->canManageOperations()
            || $task->owner_id === $user->id
            || $task->created_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->canManageOperations();
    }

    public function update(User $user, Task $task): bool
    {
        return $user->canManageOperations()
            || $task->owner_id === $user->id
            || $task->created_by === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->canManageOperations()
            || $task->owner_id === $user->id
            || $task->created_by === $user->id;
    }

    public function restore(User $user, Task $task): bool
    {
        return $user->canManageOperations();
    }

    public function forceDelete(User $user, Task $task): bool
    {
        return $user->isOwner();
    }
}
