<?php
// includes/mailer.php - Lógica de envío de correos institucionales

require_once __DIR__ . '/phpmailer/Exception.php';
require_once __DIR__ . '/phpmailer/PHPMailer.php';
require_once __DIR__ . '/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class Mailer {
    // Configuración de correos (Ajustar según necesidad)
    private static $EMAILS = [
        'gerente'         => 'fjberrospi@colegiolacatolica.edu.pe',
        'finanzas'        => 'yichoy.finanzas@gmail.com',
        'tesoreria'       => 'mflores@colegiolacatolica.edu.pe',
        'compras'         => 'compras@colegiolacatolica.edu.pe',
        'bcc_aprobacion'  => 'correoprueba@colegiolacatolica.edu.pe',
        'contabilidad'    => 'soportecentria@colegiolacatolica.edu.pe'
    ];

    /**
     * Expone el email configurado para un rol/clave dado.
     * Usado en purchases.php para guardar el email_destinatario en el token.
     */
    public static function getEmail(string $key): string {
        return self::$EMAILS[$key] ?? '';
    }

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

        $bcc_oculto = self::$EMAILS['bcc_aprobacion'];

        // 1. Enviar al Gerente (BCC oculto a correoprueba)
        self::sendHTML(
            self::$EMAILS['gerente'],
            "Nueva {$prefix} {$oc['numero_oc']} pendiente de su aprobación",
            self::getTemplate($oc, $items, $tokens['gerente'], 'gerente_general', $base_url),
            $bcc_oculto
        );

        // 2. Enviar al Jefe de Finanzas (BCC oculto a correoprueba)
        self::sendHTML(
            self::$EMAILS['finanzas'],
            "Nueva {$prefix} {$oc['numero_oc']} pendiente de su aprobación financiera",
            self::getTemplate($oc, $items, $tokens['finanzas'], 'jefe_finanzas', $base_url),
            $bcc_oculto
        );
    }

    public static function sendOCReminderNotification($orden_id, $token, $rol) {
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
        
        if (!$oc) return false;

        $prefix = ($oc['tipo'] === 'servicio') ? 'OS' : 'OC';

        $items_stmt = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ?");
        $items_stmt->execute([$orden_id]);
        $items = $items_stmt->fetchAll();

        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost/inventario-catolica';
        $php_self = isset($_SERVER['PHP_SELF']) ? $_SERVER['PHP_SELF'] : '/api/cron_notifications.php';
        $base_url = "http://" . $host . str_replace(['/api/purchases.php', '/api/cron_notifications.php'], '', $php_self);
        $base_url = rtrim($base_url, '/');

        $bcc_oculto = self::$EMAILS['bcc_aprobacion'];

        if ($rol === 'gerente_general') {
            $to = self::$EMAILS['gerente'];
            $subject = "RECUERDO: {$prefix} {$oc['numero_oc']} pendiente de su aprobación";
            $html = self::getTemplate($oc, $items, $token, 'gerente_general', $base_url, true);
            return self::sendHTML($to, $subject, $html, $bcc_oculto);
        } else if ($rol === 'jefe_finanzas') {
            $to = self::$EMAILS['finanzas'];
            $subject = "RECUERDO: {$prefix} {$oc['numero_oc']} pendiente de su aprobación financiera";
            $html = self::getTemplate($oc, $items, $token, 'jefe_finanzas', $base_url, true);
            return self::sendHTML($to, $subject, $html, $bcc_oculto);
        }
        return false;
    }

    public static function sendConformityNotification($orden_id, $is_absence = false) {
        $pdo = db();
        $stmt = $pdo->prepare("SELECT oc.*, p.razon_social as proveedor_nombre FROM ordenes_compra oc JOIN proveedores p ON oc.proveedor_id = p.id WHERE oc.id = ?");
        $stmt->execute([$orden_id]);
        $oc = $stmt->fetch();
        
        $subject = "Documentación subida: {$oc['numero_oc']} - Lista para pago";
        $title = $is_absence ? "Ausencia de Documento Marcada" : "Conformidad de Servicio Subida";
        $msg = $is_absence ? "El encargado de compras ha marcado que no existe documento físico para esta orden." : "El encargado de compras ha subido el documento de conformidad para esta orden.";

        $html = self::getSimpleTemplate($title, $msg, $oc);
        
        self::sendHTML(self::$EMAILS['tesoreria'], $subject, $html);
        self::sendHTML(self::$EMAILS['finanzas'], $subject, $html);
    }

    private static function getSimpleTemplate($title, $msg, $oc, $monto = null) {
        $monto_html = $monto ? "<p style='margin:0; color: #1b5cff; font-size: 18px;'><strong>Monto: S/ " . number_format($monto, 2) . "</strong></p>" : "";
        return "
        <div style='font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
            <div style='background: #1b5cff; color: white; padding: 20px; text-align: center;'>
                <h1 style='margin:0; font-size: 20px;'>CATÓLICA SCHOOL</h1>
                <p style='margin:5px 0 0; opacity: 0.8;'>{$title}</p>
            </div>
            <div style='padding: 20px;'>
                <p>{$msg}</p>
                <div style='background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;'>
                    <p style='margin:0 0 5px;'><strong>Documento:</strong> {$oc['numero_oc']}</p>
                    <p style='margin:0 0 5px;'><strong>Proveedor:</strong> {$oc['proveedor_nombre']}</p>
                    {$monto_html}
                </div>
                <p style='font-size: 13px; color: #64748b;'>Por favor, ingrese al sistema para procesar el pago o verificar la documentación.</p>
            </div>
            <div style='background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b;'>
                <p style='margin: 0 0 10px; color: #dc2626; font-weight: bold;'>⚠️ Por favor, NO responda a este correo. Toda gestión o consulta debe realizarse directamente con el encargado de compras.</p>
                Este es un correo automático, por favor no lo responda.<br>
                © " . date('Y') . " Católica School - Gestión de Tesorería.
            </div>
        </div>";
    }

    public static function sendPaymentReminder($oc, $daysRemaining) {
        $to = self::$EMAILS['tesoreria'];
        $subject = ($daysRemaining == 0 ? "🛑 HOY VENCE: " : "⚠️ VENCE EN $daysRemaining DÍAS: ") . ($oc['tipo'] === 'servicio' ? 'OS' : 'OC') . " " . $oc['numero_oc'];
        $html = self::getReminderTemplate($oc, $daysRemaining);
        return self::sendHTML($to, $subject, $html);
    }

    private static function getReminderTemplate($oc, $daysRemaining) {
        $monSym = $oc['moneda'] === 'USD' ? '$' : ($oc['moneda'] === 'EUR' ? '€' : 'S/');
        $total = $oc['total'] + $oc['monto_movilidad'];
        $status_color = ($daysRemaining == 0) ? "#ef4444" : (($daysRemaining == 1) ? "#f97316" : "#f59e0b");
        $status_text = ($daysRemaining == 0) ? "VENCE HOY" : "VENCE EN $daysRemaining DÍAS";

        return "
        <div style='font-family: -apple-system, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;'>
            <div style='background-color: {$status_color}; padding: 20px; text-align: center; color: white;'>
                <h2 style='margin:0; font-size: 18px; font-weight: 800;'>ALERTA DE TESORERÍA</h2>
                <p style='margin:4px 0 0; font-size: 12px; font-weight: 600; opacity: 0.9;'>{$status_text}</p>
            </div>
            <div style='padding: 32px 24px;'>
                <p style='font-size: 15px; color: #64748b; line-height: 1.5;'>
                    Se ha detectado un compromiso de pago próximo a vencer.
                </p>
                
                <div style='background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; margin: 24px 0;'>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Documento</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 800; text-align: right; color: #1b5cff;'>{$oc['numero_oc']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Proveedor</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right;'>{$oc['proveedor_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Monto Total</td>
                            <td style='padding: 6px 0; font-size: 16px; font-weight: 900; text-align: right; color: #1e293b;'>{$monSym} " . number_format($total, 2) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Fecha Vencimiento</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: {$status_color};'>{$oc['fecha_vencimiento']}</td>
                        </tr>
                    </table>
                </div>

                <div style='text-align: center;'>
                    <p style='font-size: 13px; color: #64748b; margin-bottom: 20px;'>Por favor, asegúrese de programar este pago para evitar cargos por mora o suspensión de servicios.</p>
                </div>
            </div>
            <div style='background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;'>
                <p style='margin: 0 0 10px; font-size: 11px; color: #dc2626; font-weight: bold;'>⚠️ Por favor, NO responda a este correo. Toda gestión o consulta debe realizarse directamente con el encargado de compras.</p>
                <p style='margin: 0; font-size: 10px; color: #94a3b8;'>© " . date('Y') . " Católica School · Sistema de Gestión de Inventario</p>
            </div>
        </div>";
    }

    private static function sendHTML($to, $subject, $html, $bcc = null) {
        // No enviar correos si estamos en entorno local (localhost o 127.0.0.1)
        $is_local = (!isset($_SERVER['SERVER_NAME']) || $_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1');
        if ($is_local) {
            error_log("MAIL SIMULATION (Localhost) to: $to, subject: $subject");
            return true;
        }

        $mail = new PHPMailer(true);

        try {
            if (defined('USE_NATIVE_MAIL') && USE_NATIVE_MAIL === true) {
                // Modo producción: Usar la función mail() nativa del hosting
                $mail->isMail();
            } else {
                // Modo local/desarrollo: Usar SMTP
                $mail->isSMTP();
                $mail->Host       = SMTP_HOST;
                $mail->SMTPAuth   = true;
                $mail->Username   = SMTP_USER;
                $mail->Password   = SMTP_PASS;

                if (SMTP_SECURE === 'ssl') {
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                } elseif (SMTP_SECURE === 'tls') {
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                } else {
                    $mail->SMTPSecure = '';
                    $mail->SMTPAuth   = false;
                }

                $mail->Port = SMTP_PORT;

                // Parche para hostings compartidos: evitar fallos de verificación SSL
                $mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer'       => false,
                        'verify_peer_name'  => false,
                        'allow_self_signed' => true
                    ]
                ];
            }

            $mail->CharSet = 'UTF-8';

            // Remitente y destinatario principal
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($to);

            // BCC oculto (el destinatario principal no lo ve)
            $mail->addBCC('correoprueba@colegiolacatolica.edu.pe');
            if ($bcc && $bcc !== 'correoprueba@colegiolacatolica.edu.pe') {
                $mail->addBCC($bcc);
            }

            // Contenido
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $html;

            return $mail->send();
        } catch (Exception $e) {
            error_log("PHPMailer Error enviando a {$to}: " . $mail->ErrorInfo);
            return false;
        }
    }

    private static function getTemplate($oc, $items, $token, $rol, $base_url, $is_reminder = false) {
        $tipo_label = ($oc['tipo'] === 'servicio') ? 'Orden de Servicio' : 'Orden de Compra';
        $prefix = ($oc['tipo'] === 'servicio') ? 'OS' : 'OC';
        
        if ($is_reminder) {
            $fecha_creacion = date('d/m/Y', strtotime($oc['created_at'] ?? $oc['fecha']));
            $intro_text = "Estimado(a) <strong style='color: #1e293b;'>" . ($rol === 'gerente_general' ? 'Gerente General' : 'Jefe de Finanzas') . "</strong>,<br><br>
            Se le remite este mensaje como recordatorio de que la {$tipo_label} <strong style='color: #1b5cff;'>{$oc['numero_oc']}</strong>, generada originalmente el día <strong>{$fecha_creacion}</strong>, aún se encuentra pendiente de su revisión y correspondiente aprobación o rechazo.";
        } else {
            $intro_text = "Estimado(a) <strong style='color: #1e293b;'>" . ($rol === 'gerente_general' ? 'Gerente General' : 'Jefe de Finanzas') . "</strong>,
            se ha generado una nueva solicitud que requiere su revisión:";
        }

        $items_html = "";
        foreach ($items as $it) {
            $cat  = htmlspecialchars($it['categoria_nombre'] ?? '—');
            $desc = htmlspecialchars($it['descripcion'] ?? '—');
            $monSym_item = $oc['moneda'] === 'USD' ? '$' : ($oc['moneda'] === 'EUR' ? '€' : 'S/');
            $items_html .= "<tr>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#64748b; font-weight:700; white-space:nowrap;'>{$cat}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; color:#334155; font-size:12px;'>{$desc}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:center; color:#64748b; font-size:12px; font-weight:700;'>{$it['cantidad']}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; color:#64748b; font-size:12px;'>{$monSym_item} " . number_format($it['precio_unitario'], 2) . "</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:800; color:#1b5cff; font-size:12px;'>{$monSym_item} " . number_format($it['total'], 2) . "</td>
            </tr>";
        }

        $approve_url = $base_url . "/api/remote_approve.php?token=" . $token;
        $monSym = $oc['moneda'] === 'USD' ? '$' : ($oc['moneda'] === 'EUR' ? '€' : 'S/');
        $total_operacion = $oc['total'] + $oc['monto_movilidad'];

        // ── BLOQUE DETALLADO DE CONDICIÓN DE PAGO ─────────────────────────────
        $pdo = db();
        $condicion_pago = $oc['condicion_pago'];
        $condicion_detalle = $oc['condicion_detalle'] ?? '';
        $payment_detail_html = '';

        if ($condicion_pago === 'Credito' && stripos($condicion_detalle, 'cuotas') !== false) {
            // ── CASO: Pago en Cuotas ──────────────────────────────────────────
            $cuotas_stmt = $pdo->prepare("SELECT * FROM ordenes_cuotas WHERE orden_id = ? ORDER BY numero_cuota");
            $cuotas_stmt->execute([$oc['id']]);
            $cuotas = $cuotas_stmt->fetchAll();

            $total_cuotas  = count($cuotas);
            $monto_cuota   = $total_cuotas > 0 ? floatval($cuotas[0]['monto_cuota']) : 0;

            // Tabla de cuotas
            $cuotas_rows = '';
            foreach ($cuotas as $c) {
                $cuotas_rows .= "
                <tr>
                    <td style='padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:center; font-size:12px; font-weight:700; color:#1b5cff;'>
                        Cuota {$c['numero_cuota']}/{$c['total_cuotas']}
                    </td>
                    <td style='padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:12px; color:#334155;'>
                        " . ($c['descripcion'] ?: "Cuota {$c['numero_cuota']} de {$c['total_cuotas']}") . "
                    </td>
                    <td style='padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:center; font-size:12px; color:#64748b;'>
                        " . date('d/m/Y', strtotime($c['fecha_vencimiento'])) . "
                    </td>
                    <td style='padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right; font-size:13px; font-weight:800; color:#1e293b;'>
                        {$monSym} " . number_format($c['monto_cuota'], 2) . "
                    </td>
                </tr>";
            }

            $payment_detail_html = "
            <div style='background: linear-gradient(135deg,#eff6ff,#dbeafe); padding:24px; border-radius:16px; border:2px solid #bfdbfe; margin-bottom:28px;'>
                <div style='display:flex; align-items:center; gap:10px; margin-bottom:16px;'>
                    <div style='background:#1b5cff; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;'>
                        <span style='color:#fff; font-size:18px;'>💳</span>
                    </div>
                    <div>
                        <div style='font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.05em;'>Condición de Pago</div>
                        <div style='font-size:16px; font-weight:800; color:#1e3a8a;'>Crédito en {$total_cuotas} Cuotas Iguales</div>
                    </div>
                </div>
                <div style='display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px;'>
                    <div style='background:#fff; border-radius:10px; padding:12px; text-align:center; border:1px solid #bfdbfe;'>
                        <div style='font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;'>N° de Cuotas</div>
                        <div style='font-size:22px; font-weight:900; color:#1b5cff;'>{$total_cuotas}</div>
                    </div>
                    <div style='background:#fff; border-radius:10px; padding:12px; text-align:center; border:1px solid #bfdbfe;'>
                        <div style='font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;'>Valor por Cuota</div>
                        <div style='font-size:18px; font-weight:900; color:#1e293b;'>{$monSym} " . number_format($monto_cuota, 2) . "</div>
                    </div>
                    <div style='background:#fff; border-radius:10px; padding:12px; text-align:center; border:1px solid #bfdbfe;'>
                        <div style='font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;'>Total Operación</div>
                        <div style='font-size:18px; font-weight:900; color:#1e293b;'>{$monSym} " . number_format($total_operacion, 2) . "</div>
                    </div>
                </div>
                <div style='background:#fff; border-radius:10px; overflow:hidden; border:1px solid #bfdbfe;'>
                    <div style='background:#1b5cff; padding:8px 12px;'>
                        <span style='color:#fff; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em;'>📅 Calendario de Vencimientos</span>
                    </div>
                    <table style='width:100%; border-collapse:collapse;'>
                        <thead>
                            <tr style='background:#f8fafc;'>
                                <th style='padding:8px 12px; text-align:center; font-size:10px; color:#64748b; font-weight:700;'>Cuota</th>
                                <th style='padding:8px 12px; text-align:left; font-size:10px; color:#64748b; font-weight:700;'>Descripción</th>
                                <th style='padding:8px 12px; text-align:center; font-size:10px; color:#64748b; font-weight:700;'>Vencimiento</th>
                                <th style='padding:8px 12px; text-align:right; font-size:10px; color:#64748b; font-weight:700;'>Monto</th>
                            </tr>
                        </thead>
                        <tbody>{$cuotas_rows}</tbody>
                    </table>
                </div>
            </div>";

        } elseif ($condicion_pago === 'Adelanto + Saldo') {
            // ── CASO: Adelanto + Saldo ─────────────────────────────────────────
            $adelanto_porc  = floatval($oc['adelanto_porcentaje'] ?? 0);
            $adelanto_monto = floatval($oc['adelanto_monto'] ?? ($total_operacion * $adelanto_porc / 100));
            $saldo_monto    = floatval($oc['saldo_monto'] ?? ($total_operacion - $adelanto_monto));

            $payment_detail_html = "
            <div style='background: linear-gradient(135deg,#fdf4ff,#f3e8ff); padding:24px; border-radius:16px; border:2px solid #e9d5ff; margin-bottom:28px;'>
                <div style='display:flex; align-items:center; gap:10px; margin-bottom:16px;'>
                    <div style='background:#9333ea; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;'>
                        <span style='color:#fff; font-size:18px;'>💼</span>
                    </div>
                    <div>
                        <div style='font-size:11px; font-weight:700; color:#7e22ce; text-transform:uppercase; letter-spacing:0.05em;'>Condición de Pago</div>
                        <div style='font-size:16px; font-weight:800; color:#581c87;'>Adelanto + Saldo</div>
                    </div>
                </div>
                <div style='display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;'>
                    <div style='background:#fff; border-radius:10px; padding:14px; text-align:center; border:1px solid #e9d5ff;'>
                        <div style='font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;'>Adelanto</div>
                        <div style='font-size:14px; font-weight:900; color:#7e22ce;'>" . number_format($adelanto_porc, 0) . "%</div>
                        <div style='font-size:16px; font-weight:800; color:#1e293b; margin-top:4px;'>{$monSym} " . number_format($adelanto_monto, 2) . "</div>
                        <div style='font-size:10px; color:#9333ea; font-weight:600; margin-top:4px;'>Pago inicial</div>
                    </div>
                    <div style='background:#fff; border-radius:10px; padding:14px; text-align:center; border:1px solid #e9d5ff;'>
                        <div style='font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;'>Saldo Final</div>
                        <div style='font-size:14px; font-weight:900; color:#7e22ce;'>" . number_format(100 - $adelanto_porc, 0) . "%</div>
                        <div style='font-size:16px; font-weight:800; color:#1e293b; margin-top:4px;'>{$monSym} " . number_format($saldo_monto, 2) . "</div>
                        <div style='font-size:10px; color:#9333ea; font-weight:600; margin-top:4px;'>Al entregar</div>
                    </div>
                    <div style='background:linear-gradient(135deg,#9333ea,#7c3aed); border-radius:10px; padding:14px; text-align:center;'>
                        <div style='font-size:10px; font-weight:700; color:rgba(255,255,255,0.8); text-transform:uppercase; margin-bottom:4px;'>Total Operación</div>
                        <div style='font-size:18px; font-weight:900; color:#fff; margin-top:4px;'>{$monSym} " . number_format($total_operacion, 2) . "</div>
                    </div>
                </div>
            </div>";

        } elseif ($condicion_pago === 'Alquiler') {
            // ── CASO: Alquiler mensual ─────────────────────────────────────────
            $cuotas_stmt = $pdo->prepare("SELECT COUNT(*) as total, monto_cuota, MIN(fecha_vencimiento) as proxima FROM ordenes_cuotas WHERE orden_id = ?");
            $cuotas_stmt->execute([$oc['id']]);
            $alq = $cuotas_stmt->fetch();
            $total_meses = intval($alq['total']);
            $monto_mes   = floatval($alq['monto_cuota']);

            $payment_detail_html = "
            <div style='background: linear-gradient(135deg,#f0fdf4,#dcfce7); padding:20px; border-radius:14px; border:2px solid #bbf7d0; margin-bottom:28px;'>
                <div style='font-size:11px; font-weight:700; color:#15803d; text-transform:uppercase; margin-bottom:8px;'>🏢 Condición de Pago: Alquiler Mensual</div>
                <div style='display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;'>
                    <div style='background:#fff; border-radius:8px; padding:12px; text-align:center; border:1px solid #bbf7d0;'>
                        <div style='font-size:10px; color:#64748b; font-weight:700; margin-bottom:4px;'>MESES CONTRATADOS</div>
                        <div style='font-size:20px; font-weight:900; color:#15803d;'>{$total_meses}</div>
                    </div>
                    <div style='background:#fff; border-radius:8px; padding:12px; text-align:center; border:1px solid #bbf7d0;'>
                        <div style='font-size:10px; color:#64748b; font-weight:700; margin-bottom:4px;'>CUOTA MENSUAL</div>
                        <div style='font-size:16px; font-weight:900; color:#1e293b;'>{$monSym} " . number_format($monto_mes, 2) . "</div>
                    </div>
                    <div style='background:linear-gradient(135deg,#16a34a,#15803d); border-radius:8px; padding:12px; text-align:center;'>
                        <div style='font-size:10px; color:rgba(255,255,255,0.8); font-weight:700; margin-bottom:4px;'>TOTAL OPERACIÓN</div>
                        <div style='font-size:16px; font-weight:900; color:#fff;'>{$monSym} " . number_format($total_operacion, 2) . "</div>
                    </div>
                </div>
            </div>";

        } else {
            // ── CASO: Contado / Transferencia / Crédito por días ──────────────
            $det_text = '';
            if ($condicion_pago === 'Credito' && $condicion_detalle) {
                $det_text = "<br><span style='font-size:12px; color:#92400e;'>Plazo: <strong>{$condicion_detalle}</strong>";
                if ($oc['fecha_vencimiento']) {
                    $det_text .= " · Vence: <strong>" . date('d/m/Y', strtotime($oc['fecha_vencimiento'])) . "</strong>";
                }
                $det_text .= "</span>";
            }
            $payment_detail_html = "
            <div style='background:#fefce8; padding:16px; border-radius:12px; border:1px solid #fde68a; margin-bottom:28px; display:flex; align-items:center; gap:14px;'>
                <div style='font-size:28px;'>💵</div>
                <div>
                    <div style='font-size:11px; font-weight:700; color:#92400e; text-transform:uppercase;'>Condición de Pago</div>
                    <div style='font-size:16px; font-weight:800; color:#78350f;'>{$condicion_pago}{$det_text}</div>
                    <div style='font-size:13px; color:#1e293b; font-weight:700; margin-top:6px;'>Total: {$monSym} " . number_format($total_operacion, 2) . "</div>
                </div>
            </div>";
        }
        // ── FIN BLOQUE CONDICIÓN DE PAGO ──────────────────────────────────────

        return "
        <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 620px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
            <!-- Header -->
            <div style='background: linear-gradient(135deg, #1b5cff 0%, #3b82f6 100%); padding: 24px; text-align: center; color: white;'>
                <h1 style='margin:0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;'>CATÓLICA SCHOOL</h1>
                <p style='margin:4px 0 0; font-size: 12px; font-weight: 500; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em;'>Solicitud de Autorización</p>
            </div>

            <div style='padding: 32px 24px;'>
                <p style='margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #64748b;'>
                    {$intro_text}
                </p>

                <!-- GRAND TOTAL HERO CARD -->
                <div style='background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; border-radius: 16px; margin-bottom: 32px; text-align: center; color: white; box-shadow: 0 10px 15px -3px rgba(30, 41, 59, 0.2);'>
                    <p style='margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8;'>Monto Total a Autorizar</p>
                    <h2 style='margin: 8px 0; font-size: 44px; font-weight: 900; letter-spacing: -0.05em; color: #ffffff;'>{$monSym} " . number_format($total_operacion, 2) . "</h2>
                    " . ($oc['monto_movilidad'] > 0 ? "
                    <div style='display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.1); border-radius: 24px; font-size: 11px; font-weight: 600; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1);'>
                        {$monSym} " . number_format($oc['total'], 2) . " (Items) + {$monSym} " . number_format($oc['monto_movilidad'], 2) . " (Logística)
                    </div>
                    " : "
                    <div style='display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.1); border-radius: 24px; font-size: 11px; font-weight: 600; color: #cbd5e1;'>
                        Operación 100% Items
                    </div>
                    ") . "
                </div>

                <!-- Main Data Card -->
                <div style='background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 24px;'>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Documento</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 800; text-align: right; color: #1b5cff; font-family: monospace;'>{$oc['numero_oc']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Tipo</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$tipo_label}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Proveedor</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['proveedor_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Área</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['area_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Presupuesto</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 800; text-align: right; color: " . ($oc['dentro_presupuesto'] == 1 ? '#10b981' : '#ef4444') . ";'>
                                " . ($oc['dentro_presupuesto'] == 1 ? '✅ DENTRO DE PRESUPUESTO' : '⚠️ FUERA DE PRESUPUESTO') . "
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- BLOQUE DETALLADO DE CONDICIÓN DE PAGO -->
                {$payment_detail_html}

                <!-- Observations Block -->
                " . (!empty($oc['observaciones']) ? "
                <div style='background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #dbeafe; margin-bottom: 24px;'>
                    <p style='margin:0 0 8px; color: #1b5cff; font-size: 11px; font-weight: 800; text-transform: uppercase;'>Observaciones / Justificación:</p>
                    <p style='margin:0; font-size: 13px; color: #1e3a8a; line-height: 1.6; font-style: italic;'>\"{$oc['observaciones']}\"</p>
                </div>" : "") . "

                <!-- Items Table -->
                <div style='margin-bottom: 32px;'>
                    <p style='font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;'>Detalle de la Solicitud</p>
                    <div style='border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;'>
                        <table style='width: 100%; border-collapse: collapse; font-size: 12px;'>
                            <thead>
                                <tr style='background: #f8fafc;'>
                                    <th style='padding:10px 8px; text-align:left; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Categoría</th>
                                    <th style='padding:10px 8px; text-align:left; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Descripción</th>
                                    <th style='padding:10px 8px; text-align:center; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Cant.</th>
                                    <th style='padding:10px 8px; text-align:right; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>P.U.</th>
                                    <th style='padding:10px 8px; text-align:right; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Total</th>
                                </tr>
                            </thead>
                            <tbody>{$items_html}</tbody>
                        </table>
                    </div>
                    <!-- Subtotales -->
                    <div style='display:flex; justify-content:flex-end; margin-top:12px;'>
                        <div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 18px; min-width:220px;'>
                            <div style='display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:4px;'>
                                <span>Subtotal:</span><span style='font-weight:600;'>{$monSym} " . number_format($oc['subtotal'], 2) . "</span>
                            </div>
                            <div style='display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:8px;'>
                                <span>IGV ({$oc['igv_porcentaje']}%):</span><span style='font-weight:600;'>{$monSym} " . number_format($oc['igv'], 2) . "</span>
                            </div>
                            <div style='display:flex; justify-content:space-between; font-size:14px; font-weight:800; color:#1b5cff; border-top:2px solid #e2e8f0; padding-top:8px;'>
                                <span>TOTAL:</span><span>{$monSym} " . number_format($oc['total'], 2) . "</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style='text-align: center; padding: 32px 0; background: #f8fafc; border-radius: 20px; border: 1px solid #f1f5f9;'>
                    <p style='font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 24px;'>¿Autoriza proceder con este gasto?</p>
                    <div style='display: block;'>
                        <a href='{$approve_url}' style='background-color: #22c55e; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 16px; display: inline-block; margin: 8px; min-width: 200px; box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.2);'>
                            SÍ, APROBAR
                        </a>
                    </div>
                    <div style='display: block;'>
                        <a href='{$approve_url}&action=reject' style='background-color: #ffffff; color: #ef4444; padding: 14px 28px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 14px; display: inline-block; margin: 8px; min-width: 200px; border: 2px solid #ef4444;'>
                            NO, RECHAZAR
                        </a>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style='background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
                <p style='margin: 0 0 12px; font-size: 12px; color: #dc2626; font-weight: bold;'>⚠️ Por favor, NO responda a este correo. Toda gestión o consulta debe realizarse directamente con el encargado de compras.</p>
                <p style='margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;'>
                    Este es un correo automático generado por el Sistema de Gestión de Inventario.<br>
                    <strong>Católica School</strong> · Carabayllo, Lima, Perú.<br>
                    © " . date('Y') . " Todos los derechos reservados.
                </p>
            </div>
        </div>";
    }
    public static function sendPaymentVoucherToSupplier($data) {
        // No enviar correos si estamos en entorno local (localhost o 127.0.0.1)
        $is_local = (!isset($_SERVER['SERVER_NAME']) || $_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1');
        if ($is_local) {
            error_log("MAIL SIMULATION (Localhost) to: " . $data['to'] . ", subject: " . $data['subject']);
            return true;
        }

        $mail = new PHPMailer(true);
        try {
            if (defined('USE_NATIVE_MAIL') && USE_NATIVE_MAIL === true) {
                $mail->isMail();
            } else {
                $mail->isSMTP();
                $mail->Host       = SMTP_HOST;
                $mail->SMTPAuth   = true;
                $mail->Username   = SMTP_USER;
                $mail->Password   = SMTP_PASS;
                if (SMTP_SECURE === 'ssl') {
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                } elseif (SMTP_SECURE === 'tls') {
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                } else {
                    $mail->SMTPSecure = '';
                    $mail->SMTPAuth   = false;
                }
                $mail->Port = SMTP_PORT;
                $mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer'       => false,
                        'verify_peer_name'  => false,
                        'allow_self_signed' => true
                    ]
                ];
            }

            $mail->CharSet = 'UTF-8';
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($data['to']);
            
            $cc = $data['cc'] ?? 'compras@colegiolacatolica.edu.pe';
            if ($cc) {
                $mail->addCC($cc);
            }
            
            // BCC oculto
            $mail->addBCC('correoprueba@colegiolacatolica.edu.pe');

            // Cargar items y datos de la orden
            $clean_oc = trim(explode(' ', $data['oc_number'])[0]);
            $pdo = db();
            $stmt = $pdo->prepare("SELECT id, total, igv, subtotal, igv_porcentaje FROM ordenes_compra WHERE numero_oc = ?");
            $stmt->execute([$clean_oc]);
            $ocRow = $stmt->fetch();
            
            $items = [];
            if ($ocRow) {
                $itemsStmt = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ? ORDER BY id");
                $itemsStmt->execute([$ocRow['id']]);
                $items = $itemsStmt->fetchAll();
            }

            $mail->Subject = $data['subject'];
            $mail->Body = self::getPaymentVoucherTemplate($data, $items, $ocRow);
            $mail->isHTML(true);
            return $mail->send();
        } catch (Exception $e) {
            error_log("PHPMailer Error en sendPaymentVoucherToSupplier a {$data['to']}: " . $mail->ErrorInfo);
            return false;
        }
    }

    private static function getPaymentVoucherTemplate($d, $items = [], $ocRow = null) {
        $monSym = $d['moneda'] === 'USD' ? '$' : ($d['moneda'] === 'EUR' ? '€' : 'S/');
        $monto = isset($d['monto']) ? $d['monto'] : ($d['amount'] ?? 0);

        // Construir tabla de ítems
        $items_html = "";
        foreach ($items as $it) {
            $cat  = htmlspecialchars($it['categoria_nombre'] ?? '—');
            $desc = htmlspecialchars($it['descripcion'] ?? '—');
            $items_html .= "<tr>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#64748b; font-weight:700; white-space:nowrap;'>{$cat}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; color:#334155; font-size:12px;'>{$desc}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:center; color:#64748b; font-size:12px; font-weight:700;'>{$it['cantidad']}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; color:#64748b; font-size:12px;'>{$monSym} " . number_format($it['precio_unitario'], 2) . "</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:800; color:#1b5cff; font-size:12px;'>{$monSym} " . number_format($it['total'], 2) . "</td>
            </tr>";
        }

        $items_section_html = "";
        if (!empty($items)) {
            $totals_html = "";
            if ($ocRow) {
                $totals_html = "
                <div style='display:flex; justify-content:flex-end; margin-top:12px;'>
                    <div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 18px; min-width:220px; box-sizing: border-box;'>
                        <div style='display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:4px;'>
                            <span style='margin-right:15px;'>Subtotal:</span><span style='font-weight:600;'>{$monSym} " . number_format($ocRow['subtotal'], 2) . "</span>
                        </div>
                        <div style='display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:8px;'>
                            <span style='margin-right:15px;'>IGV (" . floatval($ocRow['igv_porcentaje']) . "%):</span><span style='font-weight:600;'>{$monSym} " . number_format($ocRow['igv'], 2) . "</span>
                        </div>
                        <div style='display:flex; justify-content:space-between; font-size:14px; font-weight:800; color:#1b5cff; border-top:2px solid #e2e8f0; padding-top:8px;'>
                            <span style='margin-right:15px;'>TOTAL COMPRA:</span><span>{$monSym} " . number_format($ocRow['total'], 2) . "</span>
                        </div>
                    </div>
                </div>";
            }

            $items_section_html = "
            <div style='margin-top: 24px; margin-bottom: 24px;'>
                <p style='font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;'>Detalle de Compra</p>
                <div style='border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;'>
                    <table style='width: 100%; border-collapse: collapse; font-size: 12px;'>
                        <thead>
                            <tr style='background: #f8fafc;'>
                                <th style='padding:10px 8px; text-align:left; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Categoría</th>
                                <th style='padding:10px 8px; text-align:left; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Descripción</th>
                                <th style='padding:10px 8px; text-align:center; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Cant.</th>
                                <th style='padding:10px 8px; text-align:right; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>P.U.</th>
                                <th style='padding:10px 8px; text-align:right; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Total</th>
                            </tr>
                        </thead>
                        <tbody>{$items_html}</tbody>
                    </table>
                </div>
                {$totals_html}
            </div>";
        }

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
                        <tr><td style='padding:4px 0; font-size:12px; color:#64748b;'>Concepto:</td><td style='padding:4px 0; font-weight:bold; text-align:right;'> " . ($d['concept'] ?? 'Pago de Orden de Compra / Servicio') . "</td></tr>
                        <tr><td style='padding:4px 0; font-size:12px; color:#64748b;'>Monto Pagado:</td><td style='padding:4px 0; font-weight:bold; text-align:right; color:#1b5cff; font-size:16px;'>{$monSym} " . number_format($monto, 2) . "</td></tr>
                    </table>
                </div>

                {$items_section_html}

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
                <p style='margin: 0 0 10px; color: #dc2626; font-weight: bold;'>⚠️ Por favor, NO responda a este correo. Toda gestión o consulta debe realizarse directamente con el encargado de compras.</p>
                Este es un correo automático de confirmación.<br>
                © " . date('Y') . " Católica School - Gestión Institucional.
            </div>
        </div>";
    }

    public static function sendApprovedRequisitionToTreasury($orden_id) {
        $pdo = db();
        
        // Obtener datos de la OC/OS
        $stmt = $pdo->prepare("
            SELECT oc.*, p.razon_social as proveedor_nombre, a.nombre as area_nombre
            FROM ordenes_compra oc 
            JOIN proveedores p ON oc.proveedor_id = p.id 
            LEFT JOIN areas a ON oc.area_id = a.id
            WHERE oc.id = ?
        ");
        $stmt->execute([$orden_id]);
        $oc = $stmt->fetch();
        
        if (!$oc) return false;

        $tipo_label = ($oc['tipo'] === 'servicio') ? 'Orden de Servicio' : 'Orden de Compra';
        $prefix = ($oc['tipo'] === 'servicio') ? 'OS' : 'OC';
        $subject = "Nueva Requisición Aprobada para Gestionar Pago: {$prefix} {$oc['numero_oc']}";

        $items_stmt = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ?");
        $items_stmt->execute([$orden_id]);
        $items = $items_stmt->fetchAll();

        $html = self::getTreasuryApprovalTemplate($oc, $items);
        
        $to = self::$EMAILS['tesoreria'];
        $bcc_oculto = self::$EMAILS['bcc_aprobacion'];
        
        return self::sendHTML($to, $subject, $html, $bcc_oculto);
    }

    private static function getTreasuryApprovalTemplate($oc, $items) {
        $tipo_label = ($oc['tipo'] === 'servicio') ? 'Orden de Servicio' : 'Orden de Compra';
        $prefix = ($oc['tipo'] === 'servicio') ? 'OS' : 'OC';
        $monSym = $oc['moneda'] === 'USD' ? '$' : ($oc['moneda'] === 'EUR' ? '€' : 'S/');
        $total_operacion = $oc['total'] + $oc['monto_movilidad'];

        $items_html = "";
        foreach ($items as $it) {
            $cat  = htmlspecialchars($it['categoria_nombre'] ?? '—');
            $desc = htmlspecialchars($it['descripcion'] ?? '—');
            $monSym_item = $oc['moneda'] === 'USD' ? '$' : ($oc['moneda'] === 'EUR' ? '€' : 'S/');
            $items_html .= "<tr>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#64748b; font-weight:700; white-space:nowrap;'>{$cat}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; color:#334155; font-size:12px;'>{$desc}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:center; color:#64748b; font-size:12px; font-weight:700;'>{$it['cantidad']}</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; color:#64748b; font-size:12px;'>{$monSym_item} " . number_format($it['precio_unitario'], 2) . "</td>
                <td style='padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:800; color:#1b5cff; font-size:12px;'>{$monSym_item} " . number_format($it['total'], 2) . "</td>
            </tr>";
        }

        // Condición de pago resumida o detallada
        $condicion_pago = $oc['condicion_pago'];
        $condicion_detalle = $oc['condicion_detalle'] ?? '';
        $cond_label = $condicion_pago;
        if ($condicion_detalle) {
            $cond_label .= " ({$condicion_detalle})";
        }

        $php_self = $_SERVER['PHP_SELF'] ?? '';
        $php_self_clean = str_replace(['/api/purchases.php', '/api/remote_approve.php'], '', $php_self);
        $base_url = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $php_self_clean;
        $system_url = $base_url . "/index.html";

        return "
        <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 620px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
            <!-- Header -->
            <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;'>
                <div style='font-size: 36px; margin-bottom: 8px;'>✅</div>
                <h1 style='margin:0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;'>CATÓLICA SCHOOL</h1>
                <p style='margin:4px 0 0; font-size: 12px; font-weight: 500; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em;'>Nueva Requisición Aprobada</p>
            </div>

            <div style='padding: 32px 24px;'>
                <p style='margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #64748b;'>
                    Estimado equipo de <strong style='color: #1e293b;'>Tesorería</strong>,
                    se le notifica que una nueva requisición ha obtenido las 2 aprobaciones requeridas (Gerente General y Jefe de Finanzas) y se encuentra lista para gestionar su pago.
                </p>

                <!-- GRAND TOTAL CARD -->
                <div style='background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; border-radius: 16px; margin-bottom: 32px; text-align: center; color: white; box-shadow: 0 10px 15px -3px rgba(30, 41, 59, 0.2);'>
                    <p style='margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8;'>Monto Aprobado</p>
                    <h2 style='margin: 8px 0; font-size: 44px; font-weight: 900; letter-spacing: -0.05em; color: #ffffff;'>{$monSym} " . number_format($total_operacion, 2) . "</h2>
                    " . ($oc['monto_movilidad'] > 0 ? "
                    <div style='display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.1); border-radius: 24px; font-size: 11px; font-weight: 600; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1);'>
                        {$monSym} " . number_format($oc['total'], 2) . " (Items) + {$monSym} " . number_format($oc['monto_movilidad'], 2) . " (Logística)
                    </div>
                    " : "
                    <div style='display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.1); border-radius: 24px; font-size: 11px; font-weight: 600; color: #cbd5e1;'>
                        Operación 100% Items
                    </div>
                    ") . "
                </div>

                <!-- Main Data Card -->
                <div style='background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 24px;'>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Documento</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 800; text-align: right; color: #1b5cff; font-family: monospace;'>{$oc['numero_oc']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Tipo</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$tipo_label}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Proveedor</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['proveedor_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Área Solicitante</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['area_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Condición de Pago</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$cond_label}</td>
                        </tr>
                    </table>
                </div>

                <!-- Observations Block -->
                " . (!empty($oc['observaciones']) ? "
                <div style='background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #dbeafe; margin-bottom: 24px;'>
                    <p style='margin:0 0 8px; color: #1b5cff; font-size: 11px; font-weight: 800; text-transform: uppercase;'>Observaciones / Justificación:</p>
                    <p style='margin:0; font-size: 13px; color: #1e3a8a; line-height: 1.6; font-style: italic;'>\"{$oc['observaciones']}\"</p>
                </div>" : "") . "

                <!-- Items Table -->
                <div style='margin-bottom: 32px;'>
                    <p style='font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;'>Detalle de la Solicitud</p>
                    <div style='border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;'>
                        <table style='width: 100%; border-collapse: collapse; font-size: 12px;'>
                            <thead>
                                <tr style='background: #f8fafc;'>
                                    <th style='padding:10px 8px; text-align:left; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Categoría</th>
                                    <th style='padding:10px 8px; text-align:left; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Descripción</th>
                                    <th style='padding:10px 8px; text-align:center; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Cant.</th>
                                    <th style='padding:10px 8px; text-align:right; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>P.U.</th>
                                    <th style='padding:10px 8px; text-align:right; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;'>Total</th>
                                </tr>
                            </thead>
                            <tbody>{$items_html}</tbody>
                        </table>
                    </div>
                    <!-- Subtotales -->
                    <div style='display:flex; justify-content:flex-end; margin-top:12px;'>
                        <div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 18px; min-width:220px;'>
                            <div style='display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:4px;'>
                                <span>Subtotal:</span><span style='font-weight:600;'>{$monSym} " . number_format($oc['subtotal'], 2) . "</span>
                            </div>
                            <div style='display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:8px;'>
                                <span>IGV ({$oc['igv_porcentaje']}%):</span><span style='font-weight:600;'>{$monSym} " . number_format($oc['igv'], 2) . "</span>
                            </div>
                            <div style='display:flex; justify-content:space-between; font-size:14px; font-weight:800; color:#1b5cff; border-top:2px solid #e2e8f0; padding-top:8px;'>
                                <span>TOTAL:</span><span>{$monSym} " . number_format($oc['total'], 2) . "</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action CTA -->
                <div style='text-align: center; padding: 32px 24px; background: #f0fdf4; border-radius: 20px; border: 1px solid #d1fae5;'>
                    <p style='font-size: 15px; font-weight: 700; color: #065f46; margin-bottom: 20px;'>Para gestionar y registrar el pago, por favor ingrese al sistema de gestión.</p>
                    <a href='{$system_url}' style='background-color: #10b981; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);'>
                        IR AL SISTEMA DE GESTIÓN
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style='background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;'>
                <p style='margin: 0 0 12px; font-size: 12px; color: #dc2626; font-weight: bold;'>⚠️ Por favor, NO responda a este correo. Toda gestión o consulta debe realizarse directamente con el encargado de compras.</p>
                <p style='margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;'>
                    Este es un correo automático generado por el Sistema de Gestión de Inventario.<br>
                    <strong>Católica School</strong> · Carabayllo, Lima, Perú.<br>
                    © " . date('Y') . " Todos los derechos reservados.
                </p>
            </div>
        </div>";
    }
}
