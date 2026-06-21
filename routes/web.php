<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DriveConnectionController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TaskController;
use App\Models\Business;
use App\Models\DriveConnection;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('auth/login'))->name('home');
Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
Route::get('/auth/google/complete', [GoogleAuthController::class, 'complete'])->name('auth.google.complete');

Route::get('/demo-login', function () {
    abort_unless(app()->isLocal(), 404);
    Auth::login(User::where('role', 'owner')->firstOrFail());

    return to_route('today');
})->name('demo.login');

Route::get('/approve/{token}', [ApprovalController::class, 'show'])->name('approvals.show');
Route::post('/approve/{token}', [ApprovalController::class, 'respond'])->name('approvals.respond');

Route::middleware('auth')->group(function () {
    Route::get('/today', DashboardController::class)->name('today');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/my-work', fn () => Inertia::render('work/index', [
        'tasks' => Task::with(['business:id,name,slug', 'contentItem:id,title'])
            ->where('owner_id', request()->user()->id)
            ->orderBy('due_at')
            ->get(),
    ]))->name('work.index');

    Route::resource('businesses', BusinessController::class)->only(['index', 'store', 'show']);
    Route::get('/content', [ContentController::class, 'index'])->name('content.index');
    Route::get('/content/{contentItem}', [ContentController::class, 'show'])->name('content.show');
    Route::patch('/content/{contentItem}', [ContentController::class, 'update'])->name('content.update');
    Route::post('/content/{contentItem}/approvals', [ApprovalController::class, 'store'])->name('approvals.store');
    Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::patch('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::get('/calendar', fn () => Inertia::render('calendar/index', [
        'tasks' => Task::with('business:id,name')->whereNotNull('due_at')->orderBy('due_at')->get(),
    ]))->name('calendar.index');

    Route::middleware('owner')->group(function () {
        Route::get('/finance', FinanceController::class)->name('finance.index');
        Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
        Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');
        Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::post('/reports', [ReportController::class, 'store'])->name('reports.store');
        Route::get('/reports/{performancePeriod}/pdf', [ReportController::class, 'pdf'])->name('reports.pdf');
        Route::get('/team', fn () => Inertia::render('team/index', [
            'users' => User::orderBy('name')->get(),
        ]))->name('team.index');
        Route::post('/invitations', [InvitationController::class, 'store'])->name('invitations.store');
        Route::get('/settings/integrations', fn () => Inertia::render('settings/integrations', [
            'driveConnection' => DriveConnection::where('user_id', request()->user()->id)->first(),
            'businesses' => Business::orderBy('name')->get(['id', 'name', 'drive_folder_url']),
        ]))->name('integrations.index');
        Route::get('/settings/integrations/google-drive', [DriveConnectionController::class, 'redirect'])->name('drive.redirect');
        Route::get('/settings/integrations/google-drive/callback', [DriveConnectionController::class, 'callback'])->name('drive.callback');
        Route::delete('/settings/integrations/google-drive', [DriveConnectionController::class, 'destroy'])->name('drive.destroy');
        Route::post('/businesses/{business}/drive', [DriveConnectionController::class, 'provision'])->name('drive.provision');
    });
});

require __DIR__.'/settings.php';
