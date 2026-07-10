<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\GoogleDriveController;
use App\Http\Controllers\Api\V1\ProjectMediaController;
use App\Http\Controllers\Api\V1\QuoteRequestController;
use App\Http\Controllers\Api\V1\SegmentosController;
use App\Http\Controllers\Api\V1\SiteController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::post('/register', [QuoteRequestController::class, 'register'])->middleware('throttle:6,1');
    Route::get('/client-portal/{token}', [SegmentosController::class, 'clientPortal']);
    Route::get('/site', [SiteController::class, 'show']);
    // Google redirige el navegador aqui tras el consentimiento; esa navegacion no trae
    // el Referer de nuestro dominio, asi que Sanctum no la reconoce como peticion con sesion.
    // Por eso queda publica: el "code" de un solo uso es la unica credencial que importa aqui.
    Route::get('/google/callback', [GoogleDriveController::class, 'callback']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::middleware('role:Administrador')->group(function () {
            Route::get('/dashboard', [SegmentosController::class, 'dashboard']);
            Route::get('/clients', [SegmentosController::class, 'clients']);
            Route::get('/workers', [SegmentosController::class, 'workers']);
            Route::get('/projects', [SegmentosController::class, 'projects']);
            Route::post('/projects', [SegmentosController::class, 'storeProject']);
            Route::put('/projects/{project}', [SegmentosController::class, 'updateProject']);
            Route::patch('/projects/{project}/notes', [SegmentosController::class, 'updateProjectNotes']);
            Route::post('/projects/{project}/tasks', [SegmentosController::class, 'storeTask']);
            Route::patch('/tasks/{projectTask}/status', [SegmentosController::class, 'updateTaskStatus']);
            Route::delete('/tasks/{projectTask}', [SegmentosController::class, 'destroyTask']);
            Route::delete('/projects/{project}', [SegmentosController::class, 'destroyProject']);
            Route::get('/quotations', [SegmentosController::class, 'quotations']);
            Route::post('/quotations', [SegmentosController::class, 'storeQuotation']);
            Route::get('/quotations/{quotation}/pdf', [SegmentosController::class, 'quotationPdf']);
            Route::get('/calendar-events', [SegmentosController::class, 'calendarEvents']);

            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);

            Route::get('/quote-requests', [QuoteRequestController::class, 'index']);
            Route::patch('/quote-requests/{projectRequest}/status', [QuoteRequestController::class, 'updateStatus']);
            Route::post('/quote-requests/{projectRequest}/quotation', [QuoteRequestController::class, 'createQuotation']);
            Route::post('/quote-requests/{projectRequest}/approve', [QuoteRequestController::class, 'approve']);

            Route::post('/site/upload', [SiteController::class, 'upload']);
            Route::put('/site-settings', [SiteController::class, 'updateSettings']);

            Route::get('/site-services', [SiteController::class, 'servicesIndex']);
            Route::post('/site-services', [SiteController::class, 'servicesStore']);
            Route::put('/site-services/{siteService}', [SiteController::class, 'servicesUpdate']);
            Route::delete('/site-services/{siteService}', [SiteController::class, 'servicesDestroy']);

            Route::get('/site-testimonials', [SiteController::class, 'testimonialsIndex']);
            Route::post('/site-testimonials', [SiteController::class, 'testimonialsStore']);
            Route::put('/site-testimonials/{siteTestimonial}', [SiteController::class, 'testimonialsUpdate']);
            Route::delete('/site-testimonials/{siteTestimonial}', [SiteController::class, 'testimonialsDestroy']);

            Route::get('/site-gallery', [SiteController::class, 'galleryIndex']);
            Route::post('/site-gallery', [SiteController::class, 'galleryStore']);
            Route::put('/site-gallery/{siteGalleryItem}', [SiteController::class, 'galleryUpdate']);
            Route::delete('/site-gallery/{siteGalleryItem}', [SiteController::class, 'galleryDestroy']);

            Route::get('/google/connect', [GoogleDriveController::class, 'connect']);
            Route::get('/google/status', [GoogleDriveController::class, 'status']);
            Route::delete('/project-media/{projectMedia}', [ProjectMediaController::class, 'destroy']);
        });

        Route::middleware('role:Administrador|Community Manager')->group(function () {
            Route::get('/content-library', [ProjectMediaController::class, 'library']);
        });

        Route::middleware('role:Trabajador')->group(function () {
            Route::get('/my-tasks', [SegmentosController::class, 'myTasks']);
            Route::patch('/my-tasks/{projectTask}/status', [SegmentosController::class, 'updateMyTaskStatus']);
        });

        Route::middleware('role:Cliente')->group(function () {
            Route::get('/my-projects', [SegmentosController::class, 'myProjects']);
            Route::get('/my-requests', [QuoteRequestController::class, 'myRequests']);
        });

        Route::middleware('permission:upload project images')->group(function () {
            Route::post('/projects/{project}/image', [SegmentosController::class, 'uploadProjectImage']);
            Route::get('/projects/{project}/media', [ProjectMediaController::class, 'index']);
            Route::post('/projects/{project}/media', [ProjectMediaController::class, 'store']);
        });

        Route::middleware('permission:update assigned tasks')->group(function () {
            Route::patch('/projects/{project}/status', [SegmentosController::class, 'updateProjectStatus']);
        });
    });
});
