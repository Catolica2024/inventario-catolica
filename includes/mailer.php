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
            SELECT oc.*, p.razon_social as proveedor_nombre 
            FROM ordenes_compra oc 
            JOIN proveedores p ON oc.proveedor_id = p.id 
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
                    <p style='margin:0 0 5px;'><strong>Área Solicitante:</strong> {$oc['area_solicitante']}</p>
                    <p style='margin:0; color: #1b5cff; font-size: 18px;'><strong>Total: S/ " . number_format($oc['total'], 2) . "</strong></p>
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
                    <a href='{$approve_url}' style='background: #22c55e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>
                        APROBAR ORDEN AHORA
                    </a>
                    <p style='font-size: 12px; color: #666; margin-top: 15px;'>
                        Si desea rechazar u observar esta orden, por favor ingrese al sistema institucional.
                    </p>
                </div>
            </div>
            <div style='background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b;'>
                Este es un correo automático, por favor no lo responda.<br>
                © " . date('Y') . " Católica School - Sistema de Gestión de Inventario.
            </div>
        </div>";
    }
}
