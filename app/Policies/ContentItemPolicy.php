<?php

namespace App\Policies;

use App\Models\ContentItem;
use App\Models\User;

class ContentItemPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ContentItem $contentItem): bool
    {
        return $user->canManageOperations()
            || $contentItem->owner_id === $user->id
            || $contentItem->tasks()->where('owner_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->canManageOperations();
    }

    public function update(User $user, ContentItem $contentItem): bool
    {
        return $user->canManageOperations() || $contentItem->owner_id === $user->id;
    }
}
