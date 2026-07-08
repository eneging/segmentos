<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;

class CloudinaryUploader
{
    public function upload(UploadedFile $file, string $folder): string
    {
        $cloudinary = new Cloudinary(['cloud' => config('services.cloudinary')]);

        $result = $cloudinary->uploadApi()->upload($file->getRealPath(), [
            'folder' => $folder,
        ]);

        return $result['secure_url'];
    }
}
