<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SiteGalleryItem;
use App\Models\SiteService;
use App\Models\SiteSetting;
use App\Models\SiteTestimonial;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

        $permissions = collect([
            'manage users',
            'manage clients',
            'manage projects',
            'manage quotations',
            'view reports',
            'update assigned tasks',
            'upload project images',
            'view client portal',
        ])->map(fn (string $name) => Permission::firstOrCreate(['name' => $name]));

        $administrator = Role::firstOrCreate(['name' => 'Administrador']);
        $workerRole = Role::firstOrCreate(['name' => 'Trabajador']);
        $clientRole = Role::firstOrCreate(['name' => 'Cliente']);

        $administrator->syncPermissions($permissions);
        $workerRole->syncPermissions(['update assigned tasks', 'upload project images']);
        $clientRole->syncPermissions(['view client portal']);
        $admin->assignRole($administrator);

        $clienteUser = User::factory()->create([
            'name' => 'Maria Fernanda Ruiz',
            'email' => 'cliente@example.com',
            'password' => Hash::make('password'),
        ]);
        $clienteUser->assignRole($clientRole);

        $clients = collect([
            ['user_id' => $clienteUser->id, 'name' => 'Maria Fernanda Ruiz', 'email' => 'maria@segmentos.demo', 'phone' => '+51 987 441 220', 'document' => 'DNI 45891230', 'address' => 'Miraflores, Lima', 'is_frequent' => true],
            ['name' => 'Constructora Altura', 'email' => 'proyectos@altura.demo', 'phone' => '+51 994 220 118', 'document' => 'RUC 20604411220', 'address' => 'San Isidro, Lima', 'company' => 'Altura SAC', 'is_frequent' => true],
            ['name' => 'Estudio Lateral', 'email' => 'hola@lateral.demo', 'phone' => '+51 955 002 100', 'document' => 'RUC 20445588991', 'address' => 'Barranco, Lima', 'company' => 'Lateral Arquitectos'],
            ['name' => 'Carlos Benavides', 'email' => 'carlos@segmentos.demo', 'phone' => '+51 999 310 444', 'document' => 'DNI 40118824', 'address' => 'La Molina, Lima'],
        ])->map(fn (array $client) => Client::create($client));

        $trabajadorUser = User::factory()->create([
            'name' => 'Rafael Soto',
            'email' => 'trabajador@example.com',
            'password' => Hash::make('password'),
        ]);
        $trabajadorUser->assignRole($workerRole);

        $workers = collect([
            ['user_id' => $trabajadorUser->id, 'name' => 'Rafael Soto', 'role' => 'Jefe de taller', 'phone' => '+51 900 100 111'],
            ['name' => 'Lucia Vega', 'role' => 'Diseno y acabados', 'phone' => '+51 900 100 112'],
            ['name' => 'Marco Pena', 'role' => 'Instalacion', 'phone' => '+51 900 100 113'],
        ])->map(fn (array $worker) => \App\Models\Worker::create($worker));

        $projects = collect([
            ['Cocina premium en nogal', 0, 0, 'Hogar', 'Alta', 'Urgente', 'Produccion', 64, '2026-07-13', 28500, 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80'],
            ['Mobiliario ejecutivo', 1, 1, 'Empresa', 'Media', 'Alta', 'Produccion', 42, '2026-07-18', 47200, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80'],
            ['Closet boutique a medida', 3, 0, 'Hogar', 'Media', 'Media', 'Diseno', 28, '2026-07-26', 16800, 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?auto=format&fit=crop&w=900&q=80'],
            ['Recepcion hotel boutique', 2, 2, 'Proyecto Arquitectonico', 'Alta', 'Alta', 'Instalacion', 86, '2026-07-10', 61200, 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80'],
            ['Paneles decorativos sala', 0, 1, 'Hogar', 'Baja', 'Baja', 'Entregado', 100, '2026-07-02', 9200, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80'],
        ])->map(function (array $item, int $index) use ($clients, $workers) {
            return Project::create([
                'code' => 'SEG-2026-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'name' => $item[0],
                'client_id' => $clients[$item[1]]->id,
                'responsible_worker_id' => $workers[$item[2]]->id,
                'type' => $item[3],
                'complexity' => $item[4],
                'priority' => $item[5],
                'status' => $item[6],
                'progress' => $item[7],
                'estimated_delivery_at' => $item[8],
                'estimated_cost' => $item[9],
                'cover_image_url' => $item[10],
                'client_access_token' => Str::random(40),
            ]);
        });

        foreach ($projects as $project) {
            foreach (['Medidas', 'Diseno', 'Compra de materiales', 'Corte', 'Armado', 'Lijado', 'Pintura', 'Instalacion'] as $task) {
                ProjectTask::create([
                    'project_id' => $project->id,
                    'worker_id' => $project->responsible_worker_id,
                    'title' => $task,
                    'status' => $project->progress > 65 ? 'Terminada' : 'En progreso',
                    'estimated_hours' => 6,
                    'real_hours' => $project->progress > 65 ? 5.5 : 2,
                ]);
            }
        }

        foreach ($projects->take(3) as $index => $project) {
            $subtotal = [6800, 14500, 9200][$index];
            $quotation = Quotation::create([
                'number' => 'SEG-COT-2026-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'client_id' => $project->client_id,
                'project_id' => $project->id,
                'status' => 'Pendiente',
                'issue_date' => now(),
                'delivery_time' => '28 dias calendario',
                'subtotal' => $subtotal,
                'igv' => $subtotal * 0.18,
                'total' => $subtotal * 1.18,
                'conditions' => '60% de adelanto, saldo contra instalacion.',
            ]);

            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'description' => 'Mueble premium a medida',
                'quantity' => 1,
                'unit_price' => $subtotal,
                'subtotal' => $subtotal,
            ]);
        }

        foreach ($projects as $project) {
            CalendarEvent::create([
                'project_id' => $project->id,
                'title' => 'Entrega: '.$project->name,
                'type' => 'Entrega',
                'starts_at' => $project->estimated_delivery_at?->setTime(10, 0) ?? now(),
            ]);
        }

        foreach ([
            ['Proyecto movido a Instalacion', 'Recepcion hotel boutique'],
            ['Cotizacion generada', 'Mobiliario ejecutivo'],
            ['Fotografias agregadas', 'Cocina premium en nogal'],
            ['Cliente comento en portal', 'Closet boutique a medida'],
        ] as $activity) {
            ActivityLog::create([
                'user_id' => $admin->id,
                'title' => $activity[0],
                'description' => $activity[1],
            ]);
        }

        SiteSetting::updateOrCreate(['id' => 1], [
            'company_name' => 'SEGMENTOS',
            'tagline' => 'Mejorando tus espacios',
            'project_role' => 'Ejecucion de obra y mobiliario',
            'hero_title' => 'Mejorando tus espacios',
            'hero_subtitle' => 'Ejecucion de obra y mobiliario a medida para hogares y empresas en Lima, desde la idea hasta la instalacion final.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
            'about_text' => 'Segmentos es un taller de carpinteria especializado en mobiliario a medida. Llevamos anos transformando espacios con piezas unicas, disenadas junto a cada cliente desde la idea hasta la instalacion final.',
            'contact_phone' => '913 332 393 / 986 652 269',
            'contact_email' => 'hola.segmentos@gmail.com',
            'contact_address' => 'Miraflores, Lima, Peru',
            'contact_whatsapp' => '913 332 393',
            'social_embeds' => [
                ['platform' => 'Facebook', 'url' => ''],
                ['platform' => 'Instagram', 'url' => ''],
                ['platform' => 'TikTok', 'url' => ''],
            ],
            'community_platform' => 'WhatsApp',
            'community_join_method' => 'Codigo QR',
            'community_qr_url' => null,
        ]);

        collect([
            ['title' => 'Cocinas a medida', 'description' => 'Diseno y fabricacion de cocinas premium en melamina y madera solida.', 'sort_order' => 1],
            ['title' => 'Closets y vestidores', 'description' => 'Espacios de almacenamiento optimizados con acabados de lujo.', 'sort_order' => 2],
            ['title' => 'Mobiliario corporativo', 'description' => 'Mobiliario ejecutivo y de oficina a medida para empresas.', 'sort_order' => 3],
        ])->each(fn (array $service) => SiteService::create($service));

        collect([
            ['client_name' => 'Maria Fernanda Ruiz', 'quote' => 'El closet quedo espectacular, superaron mis expectativas.', 'sort_order' => 1],
            ['client_name' => 'Constructora Altura', 'quote' => 'Excelente atencion y cumplimiento de plazos en todos nuestros proyectos.', 'sort_order' => 2],
        ])->each(fn (array $testimonial) => SiteTestimonial::create($testimonial));

        collect([
            ['image_url' => 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80', 'caption' => 'Cocina premium en nogal', 'sort_order' => 1],
            ['image_url' => 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?auto=format&fit=crop&w=800&q=80', 'caption' => 'Closet boutique a medida', 'sort_order' => 2],
            ['image_url' => 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80', 'caption' => 'Recepcion hotel boutique', 'sort_order' => 3],
            ['image_url' => 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80', 'caption' => 'Mobiliario ejecutivo', 'sort_order' => 4],
        ])->each(fn (array $item) => SiteGalleryItem::create($item));
    }
}
