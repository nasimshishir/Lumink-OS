<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function create(User $user): bool
    {
        return $user->canManageOperations();
    }

    public function update(User $user, Task $task): bool
    {
        return $user->canManageOperations() || $task->owner_id === $user->id;
    }
}
