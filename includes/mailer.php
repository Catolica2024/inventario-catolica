<?php
// includes/mailer.php - Lógica de envío de correos institucionales

class Mailer {
    // Configuración de correos (Ajustar según necesidad)
    private static $EMAILS = [
        'gerente' => 'correoprueba@colegiolacatolica.edu.pe',
        'finanzas' => 'magisgonza8@gmail.com',
        'tesoreria' => 'correoprueba2@colegiolacatolica.edu.pe',
        'contabilidad' => 'soportecentria@colegiolacatolica.edu.pe'
    ];

    public static function sendNewOCNotification($orden_id, $tokens) {
        $pdo = db();
        
        // Obtener datos de la OC
        $stmt = $pdo->prepare("
            SELECT oc.*, p.razon_social as proveedor_nombre, a.nombre as area_nombre
            FROM ordenes_compra oc 
            JOIN proveedores p ON oc.proveedor_id = p.id 
            LEFT JOIN areas a ON oc.area_id = a.id
            WHERE oc.id = ?
        ");
        $stmt->execute([$orden_id]);
        $oc = $stmt->fetch();
        
        $tipo_label = ($oc['tipo'] === 'servicio') ? 'Orden de Servicio' : 'Orden de Compra';
        $prefix = ($oc['tipo'] === 'servicio') ? 'OS' : 'OC';

        $items_stmt = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ?");
        $items_stmt->execute([$orden_id]);
        $items = $items_stmt->fetchAll();

        $base_url = "http://" . $_SERVER['HTTP_HOST'] . str_replace('/api/purchases.php', '', $_SERVER['PHP_SELF']);

        // 1. Enviar al Gerente
        self::sendHTML(
            self::$EMAILS['gerente'],
            "Nueva {$prefix} {$oc['numero_oc']} pendiente de su aprobación",
            self::getTemplate($oc, $items, $tokens['gerente'], 'gerente_general', $base_url)
        );

        // 2. Enviar al Jefe de Finanzas
        self::sendHTML(
            self::$EMAILS['finanzas'],
            "Nueva {$prefix} {$oc['numero_oc']} pendiente de su aprobación financiera",
            self::getTemplate($oc, $items, $tokens['finanzas'], 'jefe_finanzas', $base_url)
        );
    }

    private static function sendHTML($to, $subject, $html) {
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: Católica School <operations@colegiolacatolica.edu.pe>" . "\r\n";
        
        // El usuario solicitó remover las copias CC por ahora
        return mail($to, $subject, $html, $headers);
    }

    private static function getTemplate($oc, $items, $token, $rol, $base_url) {
        $tipo_label = ($oc['tipo'] === 'servicio') ? 'Orden de Servicio' : 'Orden de Compra';
        $items_html = "";
        foreach ($items as $it) {
            $items_html .= "<tr>
                <td style='padding:8px; border-bottom:1px solid #eee;'>{$it['descripcion']}</td>
                <td style='padding:8px; border-bottom:1px solid #eee; text-align:center;'>{$it['cantidad']}</td>
                <td style='padding:8px; border-bottom:1px solid #eee; text-align:right;'>S/ " . number_format($it['precio_unitario'], 2) . "</td>
                <td style='padding:8px; border-bottom:1px solid #eee; text-align:right; font-weight:bold;'>S/ " . number_format($it['total'], 2) . "</td>
            </tr>";
        }

        $approve_url = $base_url . "/api/remote_approve.php?token=" . $token;

        return "
        <div style='font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
            <div style='background: #1b5cff; color: white; padding: 20px; text-align: center;'>
                <h1 style='margin:0; font-size: 20px;'>CATÓLICA SCHOOL</h1>
                <p style='margin:5px 0 0; opacity: 0.8;'>Notificación de {$tipo_label}</p>
            </div>
            <div style='padding: 20px;'>
                <p>Estimado(a) <strong>" . ($rol === 'gerente_general' ? 'Gerente General' : 'Jefe de Finanzas') . "</strong>,</p>
                <p>Se ha registrado una nueva <strong>{$tipo_label}</strong> que requiere su revisión y aprobación en el sistema.</p>
                
                <div style='background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;'>
                    <p style='margin:0 0 5px;'><strong>Documento:</strong> {$oc['numero_oc']}</p>
                    <p style='margin:0 0 5px;'><strong>Proveedor:</strong> {$oc['proveedor_nombre']}</p>
                    <p style='margin:0 0 5px;'><strong>Área Solicitante:</strong> {$oc['area_nombre']}</p>
                    <p style='margin:0 0 5px;'><strong>Condición de Pago:</strong> {$oc['condicion_pago']}" . 
                        ($oc['condicion_pago'] === 'Adelanto + Saldo' ? " (" . number_format($oc['adelanto_porcentaje'], 0) . "% / " . (100 - number_format($oc['adelanto_porcentaje'], 0)) . "%)" : 
                        ($oc['condicion_detalle'] ? " ({$oc['condicion_detalle']})" : "")) . "</p>
                    " . ($oc['condicion_pago'] === 'Adelanto + Saldo' ? 
                        "<p style='margin:0 0 5px; font-size:12px; color:#1b5cff;'><strong>Adelanto (" . number_format($oc['adelanto_porcentaje'], 0) . "%): S/ " . number_format($oc['adelanto_monto'], 2) . "</strong> / Saldo: S/ " . number_format($oc['saldo_monto'], 2) . "</p>" : "") . "
                    " . (strpos($oc['condicion_detalle'], 'cuotas') !== false ? 
                        "<p style='margin:0 0 5px; font-size:12px; color:#666;'><em>* Se cancelará en " . intval($oc['condicion_detalle']) . " cuotas de S/ " . number_format($oc['total'] / max(1, intval($oc['condicion_detalle'])), 2) . " c/u.</em></p>" : "") . "
                    <p style='margin:0; color: #1b5cff; font-size: 18px;'><strong>Total: S/ " . number_format($oc['total'], 2) . "</strong> <span style='font-size:12px; color:#666;'>(Inc. " . ($oc['igv_porcentaje'] ?? 18) . "% IGV)</span></p>
                </div>

                <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>
                    <thead>
                        <tr style='background: #eee;'>
                            <th style='padding:8px; text-align:left;'>Descripción</th>
                            <th style='padding:8px;'>Cant.</th>
                            <th style='padding:8px; text-align:right;'>P.U.</th>
                            <th style='padding:8px; text-align:right;'>Total</th>
                        </tr>
                    </thead>
                    <tbody>{$items_html}</tbody>
                </table>

                <div style='margin-top: 30px; text-align: center;'>
                    <a href='{$approve_url}' style='background: #22c55e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 5px;'>
                        APROBAR ORDEN
                    </a>
                    <a href='{$approve_url}&action=reject' style='background: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 5px;'>
                        RECHAZAR ORDEN
                    </a>
                </div>
            </div>
            <div style='background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b;'>
                Este es un correo automático, por favor no lo responda.<br>
                © " . date('Y') . " Católica School - Sistema de Gestión de Inventario.
            </div>
        </div>";
    }
    public static function sendPaymentVoucherToSupplier($data) {
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: Católica School <operations@colegiolacatolica.edu.pe>" . "\r\n";
        $headers .= "Cc: " . ($data['cc'] ?? 'compras@colegiolacatolica.edu.pe') . "\r\n";
        
        return @mail($data['to'], $data['subject'], self::getPaymentVoucherTemplate($data), $headers);
    }

    private static function getPaymentVoucherTemplate($d) {
        $monSym = $d['moneda'] === 'USD' ? '$' : ($d['moneda'] === 'EUR' ? '€' : 'S/');
        return "
        <div style='font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
            <div style='background: #1b5cff; color: white; padding: 20px; text-align: center;'>
                <h1 style='margin:0; font-size: 20px;'>CATÓLICA SCHOOL</h1>
                <p style='margin:5px 0 0; opacity: 0.8;'>Confirmación de Pago a Proveedor</p>
            </div>
            <div style='padding: 20px;'>
                <p>Estimado(a) <strong>{$d['provider']}</strong>,</p>
                <p>Le informamos que se ha realizado un depósito correspondiente a la orden <strong>{$d['oc_number']}</strong>.</p>
                
                <div style='background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;'>
                    <table style='width: 100%;'>
                        <tr><td style='padding:4px 0; font-size:12px; color:#64748b;'>Documento Ref:</td><td style='padding:4px 0; font-weight:bold; text-align:right;'>{$d['oc_number']}</td></tr>
                        <tr><td style='padding:4px 0; font-size:12px; color:#64748b;'>Concepto:</td><td style='padding:4px 0; font-weight:bold; text-align:right;'>{$d['concept']}</td></tr>
                        <tr><td style='padding:4px 0; font-size:12px; color:#64748b;'>Monto Pagado:</td><td style='padding:4px 0; font-weight:bold; text-align:right; color:#1b5cff; font-size:16px;'>{$monSym} " . number_format($d['amount'], 2) . "</td></tr>
                    </table>
                </div>

                <div style='text-align: center; margin: 30px 0;'>
                    <p style='font-size: 13px; color: #64748b; margin-bottom: 15px;'>Puede visualizar y descargar el voucher de depósito haciendo clic en el siguiente botón:</p>
                    <a href='{$d['voucher_url']}' style='background: #1b5cff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>
                        VER VOUCHER DE PAGO
                    </a>
                </div>

                <p style='font-size: 13px; color: #64748b; line-height: 1.5;'>
                    Si tiene alguna consulta adicional sobre este pago, por favor contactarse con el área de compras a través del correo <a href='mailto:compras@colegiolacatolica.edu.pe' style='color:#1b5cff;'>compras@colegiolacatolica.edu.pe</a>.
                </p>
            </div>
            <div style='background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b;'>
                Este es un correo automático de confirmación.<br>
                © " . date('Y') . " Católica School - Gestión Institucional.
            </div>
        </div>";
    }
}
