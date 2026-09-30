<?php

use App\Http\Controllers\Api\AgentSchemaController;
use App\Http\Controllers\Api\BusinessApiController;
use App\Http\Controllers\Api\ContentApiController;
use App\Http\Controllers\Api\ShootApiController;
use App\Http\Controllers\Api\TaskApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Self-documentation and capabilities for AI Agents
    Route::get('/agent/capabilities', [AgentSchemaController::class, 'capabilities'])->name('api.agent.capabilities');
    Route::get('/agent/guide', [AgentSchemaController::class, 'guide'])->name('api.agent.guide');
    Route::get('/openapi.json', [AgentSchemaController::class, 'openapi'])->name('api.openapi');

    // Authenticated endpoints for AI Agent execution
    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
        Route::get('/user', function (Request $request) {
            return response()->json([
                'status' => 'success',
                'user' => $request->user(),
            ]);
        });

        // Strategy & Business Workspaces
        Route::get('/businesses', [BusinessApiController::class, 'index'])->name('api.businesses.index');
        Route::get('/businesses/{business}', [BusinessApiController::class, 'show'])->name('api.businesses.show');

        // Content Deliverables & Creative Strategy
        Route::get('/content', [ContentApiController::class, 'index'])->name('api.content.index');
        Route::post('/content', [ContentApiController::class, 'store'])->name('api.content.store');
        Route::get('/content/{contentItem}', [ContentApiController::class, 'show'])->name('api.content.show');
        Route::patch('/content/{contentItem}', [ContentApiController::class, 'update'])->name('api.content.update');
        Route::delete('/content/{contentItem}', [ContentApiController::class, 'destroy'])->name('api.content.destroy');

        // Tasks & Execution Tracking
        Route::get('/tasks', [TaskApiController::class, 'index'])->name('api.tasks.index');
        Route::post('/tasks', [TaskApiController::class, 'store'])->name('api.tasks.store');
        Route::get('/tasks/{task}', [TaskApiController::class, 'show'])->name('api.tasks.show');
        Route::patch('/tasks/{task}', [TaskApiController::class, 'update'])->name('api.tasks.update');
        Route::delete('/tasks/{task}', [TaskApiController::class, 'destroy'])->name('api.tasks.destroy');

        // Shoot Sessions & Drive Shot Directory Linking
        Route::get('/shoots', [ShootApiController::class, 'index'])->name('api.shoots.index');
        Route::post('/shoots', [ShootApiController::class, 'store'])->name('api.shoots.store');
        Route::get('/shoots/{shootSession}', [ShootApiController::class, 'show'])->name('api.shoots.show');
        Route::patch('/shoots/{shootSession}', [ShootApiController::class, 'update'])->name('api.shoots.update');
    });
});
