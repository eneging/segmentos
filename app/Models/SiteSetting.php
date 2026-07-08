<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'tagline',
        'project_role',
        'hero_title',
        'hero_subtitle',
        'hero_image_url',
        'about_text',
        'contact_phone',
        'contact_email',
        'contact_address',
        'contact_whatsapp',
        'social_embeds',
        'community_platform',
        'community_join_method',
        'community_qr_url',
    ];

    protected function casts(): array
    {
        return [
            'social_embeds' => 'array',
        ];
    }

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
