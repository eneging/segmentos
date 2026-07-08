<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SiteGalleryItem;
use App\Models\SiteService;
use App\Models\SiteSetting;
use App\Models\SiteTestimonial;
use App\Services\CloudinaryUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    public function __construct(private readonly CloudinaryUploader $uploader)
    {
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'settings' => SiteSetting::current(),
            'services' => SiteService::where('is_active', true)->orderBy('sort_order')->get(),
            'testimonials' => SiteTestimonial::where('is_active', true)->orderBy('sort_order')->get(),
            'gallery' => SiteGalleryItem::where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'max:5120']]);

        $url = $this->uploader->upload($request->file('image'), 'segmentos/site');

        return response()->json(['url' => $url]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['nullable', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'project_role' => ['nullable', 'string', 'max:255'],
            'hero_title' => ['nullable', 'string', 'max:255'],
            'hero_subtitle' => ['nullable', 'string', 'max:255'],
            'hero_image_url' => ['nullable', 'string', 'max:2048'],
            'about_text' => ['nullable', 'string'],
            'contact_phone' => ['nullable', 'string', 'max:120'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_address' => ['nullable', 'string', 'max:255'],
            'contact_whatsapp' => ['nullable', 'string', 'max:60'],
            'social_embeds' => ['nullable', 'array'],
            'social_embeds.*.platform' => ['required_with:social_embeds', 'string', 'max:40'],
            'social_embeds.*.url' => ['nullable', 'string', 'max:2048'],
            'community_platform' => ['nullable', 'string', 'max:60'],
            'community_join_method' => ['nullable', 'string', 'max:120'],
            'community_qr_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $settings = SiteSetting::current();
        $settings->update($data);

        return response()->json($settings->fresh());
    }

    public function servicesIndex(): JsonResponse
    {
        return response()->json(SiteService::orderBy('sort_order')->get());
    }

    public function servicesStore(Request $request): JsonResponse
    {
        return response()->json(SiteService::create($this->validateListItem($request, [
            'title' => ['required', 'string', 'max:255'],
        ])), 201);
    }

    public function servicesUpdate(SiteService $siteService, Request $request): JsonResponse
    {
        $siteService->update($this->validateListItem($request, [
            'title' => ['required', 'string', 'max:255'],
        ]));

        return response()->json($siteService->fresh());
    }

    public function servicesDestroy(SiteService $siteService): JsonResponse
    {
        $siteService->delete();

        return response()->json(status: 204);
    }

    public function testimonialsIndex(): JsonResponse
    {
        return response()->json(SiteTestimonial::orderBy('sort_order')->get());
    }

    public function testimonialsStore(Request $request): JsonResponse
    {
        return response()->json(SiteTestimonial::create($request->validate([
            'client_name' => ['required', 'string', 'max:255'],
            'quote' => ['required', 'string'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ])), 201);
    }

    public function testimonialsUpdate(SiteTestimonial $siteTestimonial, Request $request): JsonResponse
    {
        $siteTestimonial->update($request->validate([
            'client_name' => ['required', 'string', 'max:255'],
            'quote' => ['required', 'string'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]));

        return response()->json($siteTestimonial->fresh());
    }

    public function testimonialsDestroy(SiteTestimonial $siteTestimonial): JsonResponse
    {
        $siteTestimonial->delete();

        return response()->json(status: 204);
    }

    public function galleryIndex(): JsonResponse
    {
        return response()->json(SiteGalleryItem::orderBy('sort_order')->get());
    }

    public function galleryStore(Request $request): JsonResponse
    {
        return response()->json(SiteGalleryItem::create($request->validate([
            'image_url' => ['required', 'string', 'max:2048'],
            'caption' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ])), 201);
    }

    public function galleryUpdate(SiteGalleryItem $siteGalleryItem, Request $request): JsonResponse
    {
        $siteGalleryItem->update($request->validate([
            'image_url' => ['required', 'string', 'max:2048'],
            'caption' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]));

        return response()->json($siteGalleryItem->fresh());
    }

    public function galleryDestroy(SiteGalleryItem $siteGalleryItem): JsonResponse
    {
        $siteGalleryItem->delete();

        return response()->json(status: 204);
    }

    private function validateListItem(Request $request, array $rules): array
    {
        return $request->validate([
            ...$rules,
            'description' => ['nullable', 'string'],
            'icon_url' => ['nullable', 'string', 'max:2048'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
