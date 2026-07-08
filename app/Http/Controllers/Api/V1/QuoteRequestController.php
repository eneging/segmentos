<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectRequest;
use App\Models\User;
use App\Services\CloudinaryUploader;
use App\Services\QuotationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class QuoteRequestController extends Controller
{
    public function __construct(
        private readonly CloudinaryUploader $uploader,
        private readonly QuotationService $quotationService,
    ) {
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'reference_image' => ['nullable', 'image', 'max:5120'],
        ]);

        $imageUrl = $request->hasFile('reference_image')
            ? $this->uploader->upload($request->file('reference_image'), 'segmentos/requests')
            : null;

        $user = DB::transaction(function () use ($data, $imageUrl) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);
            $user->assignRole('Cliente');

            $client = Client::create([
                'user_id' => $user->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
            ]);

            ProjectRequest::create([
                'client_id' => $client->id,
                'title' => $data['title'],
                'description' => $data['description'],
                'reference_image_url' => $imageUrl,
                'status' => 'Pendiente',
            ]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames(),
            'worker' => null,
            'client' => $user->client,
        ], 201);
    }

    public function myRequests(Request $request): JsonResponse
    {
        $client = $request->user()->client;

        if (! $client) {
            return response()->json([]);
        }

        return response()->json(
            ProjectRequest::with(['quotation.items', 'project'])->where('client_id', $client->id)->latest()->get()
        );
    }

    public function index(): JsonResponse
    {
        return response()->json(
            ProjectRequest::with(['client', 'quotation', 'project'])->latest()->get()
        );
    }

    public function updateStatus(ProjectRequest $projectRequest, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['Pendiente', 'Contactado', 'Rechazado'])],
            'rejected_reason' => ['nullable', 'string'],
        ]);

        $projectRequest->update([
            'status' => $data['status'],
            'rejected_reason' => $data['status'] === 'Rechazado' ? ($data['rejected_reason'] ?? null) : null,
            'contacted_at' => $data['status'] === 'Contactado' ? now() : $projectRequest->contacted_at,
        ]);

        return response()->json($projectRequest->fresh(['client', 'quotation', 'project']));
    }

    public function createQuotation(ProjectRequest $projectRequest, Request $request): JsonResponse
    {
        $data = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'delivery_time' => ['required', 'string', 'max:255'],
        ]);

        $quotation = DB::transaction(function () use ($data, $projectRequest) {
            $quotation = $this->quotationService->create([
                ...$data,
                'client_id' => $projectRequest->client_id,
                'project_id' => null,
            ]);

            $projectRequest->update([
                'quotation_id' => $quotation->id,
                'status' => 'Cotizado',
            ]);

            return $quotation;
        });

        ActivityLog::create([
            'title' => 'Cotizacion generada desde solicitud',
            'description' => $quotation->number,
        ]);

        return response()->json($projectRequest->fresh(['client', 'quotation.items', 'project']), 201);
    }

    public function approve(ProjectRequest $projectRequest, Request $request): JsonResponse
    {
        if (! $projectRequest->quotation_id) {
            abort(422, 'Primero genera una cotizacion para esta solicitud.');
        }

        $data = $request->validate([
            'type' => ['required', 'string'],
            'complexity' => ['required', 'string'],
            'priority' => ['required', 'string'],
            'estimated_delivery_at' => ['required', 'date'],
        ]);

        $project = DB::transaction(function () use ($data, $projectRequest) {
            $project = Project::create([
                ...$data,
                'code' => Project::nextCode(),
                'client_id' => $projectRequest->client_id,
                'name' => $projectRequest->title,
                'description' => $projectRequest->description,
                'status' => 'Pendiente',
                'progress' => 8,
                'client_access_token' => Str::random(40),
                'cover_image_url' => $projectRequest->reference_image_url
                    ?? 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?auto=format&fit=crop&w=900&q=80',
            ]);

            $projectRequest->quotation()->update(['project_id' => $project->id]);
            $projectRequest->update(['project_id' => $project->id, 'status' => 'Aprobado']);

            return $project;
        });

        ActivityLog::create([
            'project_id' => $project->id,
            'title' => 'Proyecto creado desde solicitud aprobada',
            'description' => $project->name,
        ]);

        return response()->json($projectRequest->fresh(['client', 'quotation', 'project']));
    }
}
