<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 34px 40px; }

        * { box-sizing: border-box; }

        body {
            font-family: 'Helvetica', Arial, sans-serif;
            font-size: 11.5px;
            line-height: 1.5;
            color: #1f2937;
        }

        table { width: 100%; border-collapse: collapse; }

        .accent-bar {
            height: 6px;
            background: #0f7a4f;
            margin-bottom: 22px;
        }

        /* Encabezado */
        .header-table td { vertical-align: top; }
        .brand-logo { width: 54px; height: 54px; border-radius: 10px; }
        .brand-name {
            font-size: 19px;
            font-weight: bold;
            color: #073b2a;
            letter-spacing: 0.3px;
        }
        .brand-tagline {
            font-size: 10.5px;
            color: #6b7280;
            margin-top: 2px;
        }
        .doc-title {
            text-align: right;
            font-size: 22px;
            font-weight: bold;
            color: #073b2a;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .doc-meta {
            text-align: right;
            font-size: 11px;
            color: #4b5563;
            margin-top: 6px;
        }
        .doc-meta strong { color: #1f2937; }
        .status-badge {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            border-radius: 999px;
            background: #e9f4ee;
            color: #0b4d35;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Cliente / detalles */
        .info-section { margin-top: 26px; }
        .info-table td {
            vertical-align: top;
            width: 50%;
            padding: 16px;
            background: #f7faf6;
            border: 1px solid #dce9e2;
        }
        .info-table td + td { border-left: none; }
        .info-label {
            margin: 0 0 8px;
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #a9854a;
        }
        .info-table strong { color: #1f2937; font-size: 12.5px; }
        .info-table .muted { color: #6b7280; }

        /* Tabla de items */
        .items-table { margin-top: 26px; }
        .items-table thead th {
            background: #073b2a;
            color: #fffef9;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 9px 10px;
            text-align: left;
        }
        .items-table tbody td {
            padding: 9px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 11.5px;
        }
        .items-table tbody tr:nth-child(even) td { background: #f7faf6; }
        .items-table .num { text-align: right; white-space: nowrap; }

        /* Totales */
        .totals-wrap { margin-top: 4px; }
        .totals { width: 260px; margin-left: auto; }
        .totals td { padding: 6px 10px; font-size: 11.5px; }
        .totals .label { color: #6b7280; }
        .totals .num { text-align: right; }
        .totals .total-row td {
            font-size: 14px;
            font-weight: bold;
            color: #fffef9;
            background: #0f7a4f;
        }
        .totals .total-row td:first-child { border-radius: 6px 0 0 6px; }
        .totals .total-row td:last-child { border-radius: 0 6px 6px 0; }

        /* Condiciones */
        .conditions {
            margin-top: 28px;
            padding: 14px 16px;
            background: #f7faf6;
            border-left: 3px solid #a9854a;
        }
        .conditions h3 {
            margin: 0 0 6px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #073b2a;
        }
        .conditions p { margin: 0 0 8px; color: #374151; }
        .conditions p:last-child { margin-bottom: 0; }

        /* Pie de pagina */
        .footer {
            margin-top: 34px;
            padding-top: 14px;
            border-top: 1px solid #dce9e2;
        }
        .footer-table td { vertical-align: top; font-size: 9.5px; color: #6b7280; }
        .footer-thanks {
            font-family: 'Times New Roman', Georgia, serif;
            font-style: italic;
            font-size: 13px;
            color: #073b2a;
            margin: 0 0 10px;
        }
        .footer-contact { text-align: right; }
        .footer-contact div { margin-bottom: 2px; }
    </style>
</head>
<body>
    <div class="accent-bar"></div>

    <table class="header-table">
        <tr>
            <td style="width: 54px;">
                <img class="brand-logo" src="https://res.cloudinary.com/dhuggiq9q/image/upload/v1783518145/199fe674-0858-4e7f-977e-7b3a4208ef45_v4rwhs.jpg" alt="{{ $company->company_name ?? 'Segmentos' }}">
            </td>
            <td style="padding-left: 12px;">
                <div class="brand-name">{{ $company->company_name ?? 'SEGMENTOS' }}</div>
                <div class="brand-tagline">{{ $company->tagline ?? 'Mejorando tus espacios' }}</div>
            </td>
            <td>
                <div class="doc-title">Cotizacion</div>
                <div class="doc-meta">
                    <strong>Nro. {{ $quotation->number }}</strong><br>
                    Fecha de emision: {{ optional($quotation->issue_date)->format('d/m/Y') }}
                </div>
                <div style="text-align: right;">
                    <span class="status-badge">{{ $quotation->status }}</span>
                </div>
            </td>
        </tr>
    </table>

    <table class="info-table info-section">
        <tr>
            <td>
                <p class="info-label">Cotizado a</p>
                <strong>{{ $quotation->client->name }}</strong><br>
                <span class="muted">{{ $quotation->client->company ?? 'Cliente particular' }}</span><br>
                @if ($quotation->client->document)
                    <span class="muted">{{ $quotation->client->document }}</span><br>
                @endif
                <span class="muted">{{ $quotation->client->phone ?? '' }} {{ $quotation->client->email ? '- '.$quotation->client->email : '' }}</span><br>
                @if ($quotation->client->address)
                    <span class="muted">{{ $quotation->client->address }}</span>
                @endif
            </td>
            <td>
                <p class="info-label">Detalles de la cotizacion</p>
                @if ($quotation->project)
                    <strong>Proyecto:</strong> {{ $quotation->project->code }} - {{ $quotation->project->name }}<br>
                @endif
                <strong>Tiempo de entrega:</strong> {{ $quotation->delivery_time ?? 'A definir' }}<br>
                <strong>Validez:</strong> 10 dias calendario desde la fecha de emision
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th>Descripcion</th>
                <th class="num">Cantidad</th>
                <th class="num">Precio unitario</th>
                <th class="num">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($quotation->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="num">{{ $item->quantity }}</td>
                    <td class="num">S/ {{ number_format($item->unit_price, 2) }}</td>
                    <td class="num">S/ {{ number_format($item->subtotal, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals-wrap">
        <table class="totals">
            <tr><td class="label">Subtotal</td><td class="num">S/ {{ number_format($quotation->subtotal, 2) }}</td></tr>
            <tr><td class="label">IGV (18%)</td><td class="num">S/ {{ number_format($quotation->igv, 2) }}</td></tr>
            <tr class="total-row"><td>Total</td><td class="num">S/ {{ number_format($quotation->total, 2) }}</td></tr>
        </table>
    </div>

    <div class="conditions">
        <h3>Condiciones</h3>
        <p>{{ $quotation->conditions }}</p>
        @if ($quotation->notes)
            <h3>Notas</h3>
            <p>{{ $quotation->notes }}</p>
        @endif
    </div>

    <div class="footer">
        <table class="footer-table">
            <tr>
                <td style="width: 55%;">
                    <p class="footer-thanks">Gracias por confiar en {{ $company->company_name ?? 'Segmentos' }}.</p>
                    Documento generado automaticamente el {{ now()->format('d/m/Y H:i') }}
                </td>
                <td class="footer-contact">
                    @if ($company->contact_phone)
                        <div>{{ $company->contact_phone }}</div>
                    @endif
                    @if ($company->contact_email)
                        <div>{{ $company->contact_email }}</div>
                    @endif
                    @if ($company->contact_address)
                        <div>{{ $company->contact_address }}</div>
                    @endif
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
