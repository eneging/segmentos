<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Quotation;
use App\Models\SiteSetting;
use App\Models\Worker;
use App\Services\CloudinaryUploader;
use App\Services\QuotationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class SegmentosController extends Controller
{
    public function __construct(
        private readonly CloudinaryUploader $uploader,
        private readonly QuotationService $quotationService,
    ) {
    }

    public function dashboard(): JsonResponse
    {
        $projects = Project::with(['client', 'responsible', 'tasks'])->get();
        $active = $projects->whereNotIn('status', ['Entregado', 'Finalizado']);
        $today = Carbon::today();

        return response()->json([
            'metrics' => [
                'totalProjects' => $projects->count(),
                'activeProjects' => $active->count(),
                'finishedProjects' => $projects->where('status', 'Entregado')->count(),
                'delayedProjects' => $active->filter(fn (Project $project) => $project->estimated_delivery_at?->lt($today))->count(),
                'pendingQuotations' => Quotation::where('status', 'Pendiente')->count(),
                'activeWorkers' => Worker::where('is_active', true)->count(),
            ],
            'priorityList' => $active->sortByDesc(fn (Project $project) => $this->priorityScore($project))->values()->take(6),
            'recentActivity' => ActivityLog::latest()->take(8)->get(),
            'upcomingDeadlines' => $active->sortBy('estimated_delivery_at')->values()->take(6),
            'chart' => [
                ['month' => 'Feb', 'production' => 42, 'sales' => 72000],
                ['month' => 'Mar', 'production' => 55, 'sales' => 88000],
                ['month' => 'Abr', 'production' => 48, 'sales' => 81000],
                ['month' => 'May', 'production' => 68, 'sales' => 121000],
                ['month' => 'Jun', 'production' => 74, 'sales' => 134000],
                ['month' => 'Jul', 'production' => 61, 'sales' => 98000],
            ],
        ]);
    }

    public function clients(): JsonResponse
    {
        return response()->json(Client::withCount(['projects', 'quotations'])->latest()->get());
    }

    public function workers(): JsonResponse
    {
        return response()->json(Worker::where('is_active', true)->get());
    }

    public function projects(): JsonResponse
    {
        return response()->json(Project::with(['client', 'responsible', 'tasks'])->latest()->get());
    }

    public function storeProject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'client_id' => ['required', 'exists:clients,id'],
            'type' => ['required', 'string'],
            'complexity' => ['required', 'string'],
            'priority' => ['required', 'string'],
            'estimated_delivery_at' => ['required', 'date'],
        ]);

        $project = Project::create([
            ...$data,
            'code' => Project::nextCode(),
            'status' => 'Pendiente',
            'progress' => 8,
            'client_access_token' => Str::random(40),
            'cover_image_url' => 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?auto=format&fit=crop&w=900&q=80',
        ]);

        ActivityLog::create([
            'project_id' => $project->id,
            'title' => 'Nuevo proyecto creado',
            'description' => $project->name,
        ]);

        return response()->json($project->load(['client', 'responsible', 'tasks']), 201);
    }

    public function updateProject(Project $project, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'client_id' => ['required', 'exists:clients,id'],
            'type' => ['required', 'string'],
            'complexity' => ['required', 'string'],
            'priority' => ['required', 'string'],
            'estimated_delivery_at' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'responsible_worker_id' => ['nullable', 'exists:workers,id'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0'],
        ]);

        $project->update($data);

        ActivityLog::create([
            'project_id' => $project->id,
            'title' => 'Proyecto editado',
            'description' => $project->name,
        ]);

        return response()->json($project->load(['client', 'responsible', 'tasks']));
    }

    public function updateProjectNotes(Project $project, Request $request): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $project->update($data);

        return response()->json($project->load(['client', 'responsible', 'tasks']));
    }

    public function updateTaskStatus(ProjectTask $projectTask, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:Pendiente,En progreso,Terminada'],
        ]);

        $projectTask->update($data);

        return response()->json($projectTask->load('project'));
    }

    public function storeTask(Project $project, Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $task = ProjectTask::create([
            'project_id' => $project->id,
            'worker_id' => $project->responsible_worker_id,
            'title' => $data['title'],
            'status' => 'Pendiente',
        ]);

        return response()->json($task, 201);
    }

    public function destroyTask(ProjectTask $projectTask): JsonResponse
    {
        $projectTask->delete();

        return response()->json(status: 204);
    }

    public function destroyProject(Project $project): JsonResponse
    {
        ActivityLog::create([
            'project_id' => $project->id,
            'title' => 'Proyecto eliminado',
            'description' => $project->name,
        ]);

        $project->delete();

        return response()->json(status: 204);
    }

    public function uploadProjectImage(Project $project, Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $user = $request->user();
        if ($user->hasRole('Trabajador') && ! $user->hasRole('Administrador')) {
            $worker = $user->worker;
            if (! $worker || $project->responsible_worker_id !== $worker->id) {
                abort(403, 'Solo puedes subir fotos de tus proyectos asignados.');
            }
        }

        $url = $this->uploader->upload($request->file('image'), 'segmentos/projects');

        $project->update(['cover_image_url' => $url]);

        ActivityLog::create([
            'project_id' => $project->id,
            'title' => 'Foto de proyecto actualizada',
            'description' => $project->name,
        ]);

        return response()->json($project->load(['client', 'responsible', 'tasks']));
    }

    public function updateProjectStatus(Project $project, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('Trabajador') && ! $user->hasRole('Administrador')) {
            $worker = $user->worker;
            if (! $worker || $project->responsible_worker_id !== $worker->id) {
                abort(403, 'Solo puedes actualizar el estado de tus proyectos asignados.');
            }
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'max:80'],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $project->update([
            'status' => $data['status'],
            'progress' => $data['progress'] ?? $project->progress,
        ]);

        ActivityLog::create([
            'project_id' => $project->id,
            'title' => 'Estado actualizado',
            'description' => "{$project->code} ahora esta en {$project->status}",
        ]);

        return response()->json($project->load(['client', 'responsible', 'tasks']));
    }

    public function quotations(): JsonResponse
    {
        return response()->json(Quotation::with(['client', 'project', 'items'])->latest()->get());
    }

    public function storeQuotation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'delivery_time' => ['required', 'string', 'max:255'],
        ]);

        $quotation = $this->quotationService->create($data);

        ActivityLog::create([
            'project_id' => $quotation->project_id,
            'title' => 'Cotizacion generada',
            'description' => $quotation->number,
        ]);

        return response()->json($quotation->load(['client', 'project', 'items']), 201);
    }

    public function calendarEvents(): JsonResponse
    {
        return response()->json(
            CalendarEvent::whereHas('project')->with('project.client')->latest('starts_at')->get()
        );
    }

    public function myTasks(Request $request): JsonResponse
    {
        $worker = $request->user()->worker;

        if (! $worker) {
            return response()->json([]);
        }

        return response()->json(
            ProjectTask::whereHas('project')->with('project.client')->where('worker_id', $worker->id)->latest()->get()
        );
    }

    public function updateMyTaskStatus(ProjectTask $projectTask, Request $request): JsonResponse
    {
        $worker = $request->user()->worker;
        if (! $worker || $projectTask->worker_id !== $worker->id) {
            abort(403, 'Esta tarea no esta asignada a ti.');
        }

        $data = $request->validate([
            'status' => ['required', 'in:Pendiente,En progreso,Terminada'],
            'real_hours' => ['nullable', 'numeric', 'min:0'],
            'comments' => ['nullable', 'string', 'max:1000'],
        ]);

        $projectTask->update($data);

        ActivityLog::create([
            'project_id' => $projectTask->project_id,
            'title' => 'Tarea actualizada',
            'description' => "{$projectTask->title} -> {$projectTask->status}",
        ]);

        return response()->json($projectTask->load('project.client'));
    }

    public function myProjects(Request $request): JsonResponse
    {
        $client = $request->user()->client;

        if (! $client) {
            return response()->json([]);
        }

        return response()->json(
            Project::with(['responsible', 'tasks', 'quotations.items'])->where('client_id', $client->id)->latest()->get()
        );
    }

    public function clientPortal(string $token): JsonResponse
    {
        $project = Project::with(['client', 'responsible', 'tasks', 'quotations.items'])
            ->where('client_access_token', $token)
            ->firstOrFail();

        return response()->json($project);
    }

    public function quotationPdf(Quotation $quotation)
    {
        return Pdf::loadView('pdf.quotation', [
            'quotation' => $quotation->load(['client', 'project', 'items']),
            'company' => SiteSetting::current(),
        ])->download($quotation->number.'.pdf');
    }

    private function priorityScore(Project $project): int
    {
        $days = $project->estimated_delivery_at
            ? Carbon::today()->diffInDays($project->estimated_delivery_at, false)
            : 30;

        $score = 0;
        $score += $days < 0 ? 40 : 0;
        $score += $days >= 0 && $days <= 3 ? 30 : 0;
        $score += ['Urgente' => 25, 'Alta' => 15, 'Media' => 7, 'Baja' => 2][$project->priority] ?? 0;
        $score += ['Alta' => 12, 'Media' => 7, 'Baja' => 3][$project->complexity] ?? 0;
        $score += $project->client?->is_frequent ? 8 : 0;
        $score += $project->status === 'Instalacion' ? 10 : 0;
        $score += (int) round((100 - $project->progress) / 10);

        return $score;
    }
}
