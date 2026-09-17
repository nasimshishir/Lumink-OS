<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $approval_request_id
 * @property string $client_name
 * @property string $action
 */
class ApprovalResponse extends Model
{
    protected $guarded = [];
}
