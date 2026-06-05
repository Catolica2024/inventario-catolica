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
                    Se ha detectado un compromiso de pago próximo a vencer bajo la condición de <strong>Crédito</strong>.
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
            if ($bcc) {
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

    private static function getTemplate($oc, $items, $token, $rol, $base_url) {
        $tipo_label = ($oc['tipo'] === 'servicio') ? 'Orden de Servicio' : 'Orden de Compra';
        $prefix = ($oc['tipo'] === 'servicio') ? 'OS' : 'OC';
        $items_html = "";
        foreach ($items as $it) {
            $items_html .= "<tr>
                <td style='padding:12px 8px; border-bottom:1px solid #f1f5f9; color: #334155; font-size: 12px;'>{$it['descripcion']}</td>
                <td style='padding:12px 8px; border-bottom:1px solid #f1f5f9; text-align:center; color: #64748b; font-size: 12px;'>{$it['cantidad']}</td>
                <td style='padding:12px 8px; border-bottom:1px solid #f1f5f9; text-align:right; color: #64748b; font-size: 12px;'>S/ " . number_format($it['precio_unitario'], 2) . "</td>
                <td style='padding:12px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:bold; color: #1e293b; font-size: 12px;'>S/ " . number_format($it['total'], 2) . "</td>
            </tr>";
        }

        $approve_url = $base_url . "/api/remote_approve.php?token=" . $token;
        $monSym = $oc['moneda'] === 'USD' ? '$' : ($oc['moneda'] === 'EUR' ? '€' : 'S/');
        $total_operacion = $oc['total'] + $oc['monto_movilidad'];

        return "
        <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
            <!-- Header -->
            <div style='background: linear-gradient(135deg, #1b5cff 0%, #3b82f6 100%); padding: 24px; text-align: center; color: white;'>
                <h1 style='margin:0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;'>CATÓLICA SCHOOL</h1>
                <p style='margin:4px 0 0; font-size: 12px; font-weight: 500; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em;'>Solicitud de Autorización</p>
            </div>

            <div style='padding: 32px 24px;'>
                <p style='margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #64748b;'>
                    Estimado(a) <strong style='color: #1e293b;'>" . ($rol === 'gerente_general' ? 'Gerente General' : 'Jefe de Finanzas') . "</strong>,
                    se ha generado una nueva solicitud que requiere su revisión:
                </p>

                <!-- GRAND TOTAL HERO CARD -->
                <div style='background: #1e293b; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; border-radius: 16px; margin-bottom: 32px; text-align: center; color: white; box-shadow: 0 10px 15px -3px rgba(30, 41, 59, 0.2);'>
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
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Proveedor</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['proveedor_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Área</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['area_nombre']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Pago</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 700; text-align: right; color: #1e293b;'>{$oc['condicion_pago']}" . ($oc['condicion_detalle'] ? " ({$oc['condicion_detalle']})" : "") . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 6px 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Presupuesto</td>
                            <td style='padding: 6px 0; font-size: 13px; font-weight: 800; text-align: right; color: " . ($oc['dentro_presupuesto'] == 1 ? '#10b981' : '#ef4444') . ";'>
                                " . ($oc['dentro_presupuesto'] == 1 ? '✅ DENTRO DE PRESUPUESTO' : '⚠️ FUERA DE PRESUPUESTO') . "
                            </td>
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
                                    <th style='padding:12px 8px; text-align:left; color: #64748b; font-size: 10px; font-weight: 700;'>Descripción</th>
                                    <th style='padding:12px 8px; text-align:center; color: #64748b; font-size: 10px; font-weight: 700;'>Cant.</th>
                                    <th style='padding:12px 8px; text-align:right; color: #64748b; font-size: 10px; font-weight: 700;'>P.U.</th>
                                    <th style='padding:12px 8px; text-align:right; color: #64748b; font-size: 10px; font-weight: 700;'>Total</th>
                                </tr>
                            </thead>
                            <tbody>{$items_html}</tbody>
                        </table>
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
        // Envío de correos a proveedores desactivado por solicitud del usuario
        return true;

        $mail = new PHPMailer(true);
        try {
            // Use native mail() function for sending
            $mail->isMail();
            $mail->CharSet = 'UTF-8';
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($data['to']);
            $cc = $data['cc'] ?? 'compras@colegiolacatolica.edu.pe';
            if ($cc) {
                $mail->addCC($cc);
            }
            $mail->Subject = $data['subject'];
            $mail->Body = self::getPaymentVoucherTemplate($data);
            $mail->isHTML(true);
            return $mail->send();
        } catch (Exception $e) {
            error_log("PHPMailer Error en sendPaymentVoucherToSupplier a {$data['to']}: " . $mail->ErrorInfo);
            return false;
        }
    }

    private static function getPaymentVoucherTemplate($d) {
        $monSym = $d['moneda'] === 'USD' ? '$' : ($d['moneda'] === 'EUR' ? '€' : 'S/');
        $monto = isset($d['monto']) ? $d['monto'] : ($d['amount'] ?? 0);
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
}
