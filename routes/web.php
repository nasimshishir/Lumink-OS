<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DriveConnectionController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RecycleBinController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamMemberController;
use App\Models\Business;
use App\Models\DriveConnection;
use App\Models\Invitation;
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
Route::get('/calendar/feed/{token}.ics', [CalendarController::class, 'feed'])->name('calendar.feed');

Route::middleware('auth')->group(function () {
    Route::get('/today', DashboardController::class)->name('today');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read_all');
    Route::get('/my-work', fn () => Inertia::render('work/index', [
        'tasks' => Task::with(['business:id,name,slug', 'contentItem:id,title'])
            ->where('owner_id', request()->user()->id)
            ->orderBy('due_at')
            ->get(),
    ]))->name('work.index');

    Route::patch('/businesses/{business}/toggle-status', [BusinessController::class, 'toggleStatus'])->name('businesses.toggle-status');
    Route::delete('/businesses/trash/empty', [BusinessController::class, 'emptyTrash'])->name('businesses.trash.empty');
    Route::post('/businesses/{id}/restore', [BusinessController::class, 'restore'])->name('businesses.restore');
    Route::delete('/businesses/{id}/force-delete', [BusinessController::class, 'forceDelete'])->name('businesses.force-delete');
    Route::resource('businesses', BusinessController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

    // Global Recycle Bin routes
    Route::get('/recycle-bin', [RecycleBinController::class, 'index'])->name('recycle-bin.index');
    Route::post('/recycle-bin/{type}/{id}/restore', [RecycleBinController::class, 'restore'])->name('recycle-bin.restore');
    Route::delete('/recycle-bin/{type}/{id}/force-delete', [RecycleBinController::class, 'forceDelete'])->name('recycle-bin.force-delete');
    Route::post('/recycle-bin/{type}/restore-all', [RecycleBinController::class, 'restoreAll'])->name('recycle-bin.restore-all');
    Route::delete('/recycle-bin/empty', [RecycleBinController::class, 'emptyTrash'])->name('recycle-bin.empty');

    Route::get('/content', [ContentController::class, 'index'])->name('content.index');
    Route::post('/content', [ContentController::class, 'store'])->name('content.store');
    Route::get('/content/{contentItem}', [ContentController::class, 'show'])->name('content.show');
    Route::patch('/content/{contentItem}', [ContentController::class, 'update'])->name('content.update');
    Route::delete('/content/{contentItem}', [ContentController::class, 'destroy'])->name('content.destroy');
    Route::post('/content/{contentItem}/approvals', [ApprovalController::class, 'store'])->name('approvals.store');

    Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::patch('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::get('/calendar/export', [CalendarController::class, 'export'])->name('calendar.export');
    Route::post('/calendar/regenerate-token', [CalendarController::class, 'regenerateToken'])->name('calendar.regenerate-token');

    Route::middleware('owner')->group(function () {
        Route::get('/finance', FinanceController::class)->name('finance.index');
        Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
        Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('invoices.destroy');
        Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'store'])->name('invoice-payments.store');
        Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');
        Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
        Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::post('/reports', [ReportController::class, 'store'])->name('reports.store');
        Route::get('/reports/{performancePeriod}/pdf', [ReportController::class, 'pdf'])->name('reports.pdf');
        Route::get('/team', fn () => Inertia::render('team/index', [
            'users' => User::orderByDesc('is_active')->orderBy('name')->get(),
            'invitations' => Invitation::with('inviter:id,name')
                ->whereNull('accepted_at')
                ->latest()
                ->get(),
        ]))->name('team.index');
        Route::patch('/team/{user}/toggle-status', [TeamMemberController::class, 'toggleStatus'])->name('team.toggle-status');
        Route::post('/invitations', [InvitationController::class, 'store'])->name('invitations.store');
        Route::post('/invitations/{invitation}/resend', [InvitationController::class, 'resend'])->name('invitations.resend');
        Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('invitations.destroy');

        // Roles & Permissions Manager
        Route::get('/roles', [RolePermissionController::class, 'index'])->name('roles.index');
        Route::post('/roles', [RolePermissionController::class, 'store'])->name('roles.store');
        Route::patch('/roles/{role}', [RolePermissionController::class, 'update'])->name('roles.update');
        Route::delete('/roles/{role}', [RolePermissionController::class, 'destroy'])->name('roles.destroy');
        Route::post('/roles/assign-user', [RolePermissionController::class, 'assignUser'])->name('roles.assign-user');

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
