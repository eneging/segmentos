<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Support\Facades\DB;

class QuotationService
{
    /**
     * @param  array{client_id:int,project_id:?int,description:string,quantity:int,unit_price:float,delivery_time:string}  $data
     */
    public function create(array $data): Quotation
    {
        return DB::transaction(function () use ($data) {
            $subtotal = $data['quantity'] * $data['unit_price'];
            $igv = $subtotal * 0.18;

            $quotation = Quotation::create([
                'number' => 'SEG-COT-2026-'.str_pad((string) (Quotation::count() + 1), 4, '0', STR_PAD_LEFT),
                'client_id' => $data['client_id'],
                'project_id' => $data['project_id'] ?? null,
                'status' => 'Pendiente',
                'issue_date' => now(),
                'delivery_time' => $data['delivery_time'],
                'subtotal' => $subtotal,
                'igv' => $igv,
                'total' => $subtotal + $igv,
                'conditions' => '60% de adelanto, saldo contra instalacion. Validez: 10 dias.',
            ]);

            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'description' => $data['description'],
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'],
                'subtotal' => $subtotal,
            ]);

            return $quotation;
        });
    }
}
