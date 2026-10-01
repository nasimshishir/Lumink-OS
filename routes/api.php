<?php

use App\Http\Controllers\Api\AgentSchemaController;
use App\Http\Controllers\Api\BusinessApiController;
use App\Http\Controllers\Api\ContentApiController;
use App\Http\Controllers\Api\ShootApiController;
use App\Http\Controllers\Api\TaskApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

$registerApiEndpoints = function (string $prefix = '') {
    $namePrefix = $prefix ? "api.{$prefix}." : 'api.';

    // Self-documentation and capabilities for AI Agents
    Route::get('/agent/capabilities', [AgentSchemaController::class, 'capabilities'])->name($namePrefix.'agent.capabilities');
    Route::get('/agent/guide', [AgentSchemaController::class, 'guide'])->name($namePrefix.'agent.guide');
    Route::get('/openapi.json', [AgentSchemaController::class, 'openapi'])->name($namePrefix.'openapi');
    Route::get('/agent/token-test', [AgentSchemaController::class, 'testToken'])->name($namePrefix.'agent.token-test');

    // Authenticated endpoints for AI Agent execution
    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () use ($namePrefix) {
        Route::get('/user', function (Request $request) {
            return response()->json([
                'status' => 'success',
                'user' => $request->user(),
            ]);
        });

        // Strategy & Business Workspaces
        Route::get('/businesses', [BusinessApiController::class, 'index'])->name($namePrefix.'businesses.index');
        Route::get('/businesses/{business}', [BusinessApiController::class, 'show'])->name($namePrefix.'businesses.show');
        Route::patch('/businesses/{business}/targets', [BusinessApiController::class, 'updateTargets'])->name($namePrefix.'businesses.updateTargets');

        // Content Deliverables & Creative Strategy
        Route::get('/content', [ContentApiController::class, 'index'])->name($namePrefix.'content.index');
        Route::post('/content', [ContentApiController::class, 'store'])->name($namePrefix.'content.store');
        Route::get('/content/{contentItem}', [ContentApiController::class, 'show'])->name($namePrefix.'content.show');
        Route::patch('/content/{contentItem}', [ContentApiController::class, 'update'])->name($namePrefix.'content.update');
        Route::delete('/content/{contentItem}', [ContentApiController::class, 'destroy'])->name($namePrefix.'content.destroy');

        // Tasks & Execution Tracking
        Route::get('/tasks', [TaskApiController::class, 'index'])->name($namePrefix.'tasks.index');
        Route::post('/tasks', [TaskApiController::class, 'store'])->name($namePrefix.'tasks.store');
        Route::get('/tasks/{task}', [TaskApiController::class, 'show'])->name($namePrefix.'tasks.show');
        Route::patch('/tasks/{task}', [TaskApiController::class, 'update'])->name($namePrefix.'tasks.update');
        Route::delete('/tasks/{task}', [TaskApiController::class, 'destroy'])->name($namePrefix.'tasks.destroy');

        // Shoot Sessions & Drive Shot Directory Linking
        Route::get('/shoots', [ShootApiController::class, 'index'])->name($namePrefix.'shoots.index');
        Route::post('/shoots', [ShootApiController::class, 'store'])->name($namePrefix.'shoots.store');
        Route::get('/shoots/{shootSession}', [ShootApiController::class, 'show'])->name($namePrefix.'shoots.show');
        Route::patch('/shoots/{shootSession}', [ShootApiController::class, 'update'])->name($namePrefix.'shoots.update');
    });
};

Route::prefix('v1')->group(fn () => $registerApiEndpoints('v1'));
Route::group([], fn () => $registerApiEndpoints(''));
