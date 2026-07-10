<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'client_id',
        'responsible_worker_id',
        'name',
        'type',
        'description',
        'complexity',
        'priority',
        'status',
        'starts_at',
        'estimated_delivery_at',
        'estimated_cost',
        'real_cost',
        'progress',
        'cover_image_url',
        'client_access_token',
        'notes',
        'drive_folder_id',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'estimated_delivery_at' => 'date',
            'estimated_cost' => 'decimal:2',
            'real_cost' => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'responsible_worker_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProjectMedia::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public static function nextCode(): string
    {
        return 'SEG-2026-'.str_pad((string) (static::withTrashed()->count() + 1), 4, '0', STR_PAD_LEFT);
    }
}
