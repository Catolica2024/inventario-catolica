<?php
// api/cron_notifications.php — Ejecutar diariamente para alertar pagos próximos
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/mailer.php';

try {
    $pdo = db();
    $today = date('Y-m-d');
    
    // 1. Buscar órdenes de crédito (Pago Único) pendientes de pago
    $stmt = $pdo->prepare("
        SELECT p.id, p.numero_oc, p.total, p.monto_movilidad, p.moneda, p.fecha_vencimiento, p.tipo,
               s.razon_social as proveedor_nombre
        FROM ordenes_compra p
        JOIN proveedores s ON p.proveedor_id = s.id
        WHERE p.condicion_pago = 'Credito' 
          AND p.pagado = 0 
          AND p.fecha_vencimiento IS NOT NULL
          AND p.fecha_vencimiento >= ?
    ");
    $stmt->execute([$today]);
    $purchases = $stmt->fetchAll();

    // 2. Buscar Cuotas específicas próximas a vencer
    $stmtCuotas = $pdo->prepare("
        SELECT c.id as cuota_id, c.numero_cuota, c.total_cuotas, c.monto_cuota, c.fecha_vencimiento,
               p.id as purchase_id, p.numero_oc, p.moneda, p.tipo, s.razon_social as proveedor_nombre
        FROM ordenes_cuotas c
        JOIN ordenes_compra p ON c.orden_id = p.id
        JOIN proveedores s ON p.proveedor_id = s.id
        WHERE c.pagado = 0
          AND c.fecha_vencimiento >= ?
    ");
    $stmtCuotas->execute([$today]);
    $cuotas = $stmtCuotas->fetchAll();

    // 3. Buscar órdenes de Adelanto + Saldo pendientes
    $stmtAdelantoSaldo = $pdo->prepare("
        SELECT p.id, p.numero_oc, p.total, p.monto_movilidad, p.moneda, p.tipo,
               p.adelanto_pagado, p.fecha_pago_adelanto, p.fecha_pago_saldo_proyectado,
               p.adelanto_monto, p.saldo_monto,
               s.razon_social as proveedor_nombre
        FROM ordenes_compra p
        JOIN proveedores s ON p.proveedor_id = s.id
        WHERE p.condicion_pago = 'Adelanto + Saldo'
          AND p.pagado = 0
    ");
    $stmtAdelantoSaldo->execute();
    $adelantoSaldoList = $stmtAdelantoSaldo->fetchAll();

    $notificationsCount = 0;
    $emailsSent = 0;

    // Buscar usuarios de tesorería (rol slug: 'tesoreria')
    $treasuryUsers = $pdo->query("
        SELECT u.id FROM usuarios u 
        JOIN roles r ON u.rol_id = r.id 
        WHERE r.nombre = 'tesoreria'
    ")->fetchAll();

    // Procesar Pagos Únicos
    foreach ($purchases as $oc) {
        processReminder($pdo, $oc, $today, $treasuryUsers, $notificationsCount, $emailsSent);
    }

    // Procesar Cuotas
    foreach ($cuotas as $cuota) {
        // Mapear campos de cuota a formato esperado por processReminder/Mailer
        $oc_mapped = [
            'id' => $cuota['purchase_id'],
            'numero_oc' => $cuota['numero_oc'],
            'total' => $cuota['monto_cuota'],
            'monto_movilidad' => 0, // Las cuotas son solo de la OC
            'moneda' => $cuota['moneda'],
            'fecha_vencimiento' => $cuota['fecha_vencimiento'],
            'tipo' => $cuota['tipo'],
            'proveedor_nombre' => $cuota['proveedor_nombre'],
            'is_cuota' => true,
            'cuota_info' => "Cuota {$cuota['numero_cuota']} de {$cuota['total_cuotas']}"
        ];
        processReminder($pdo, $oc_mapped, $today, $treasuryUsers, $notificationsCount, $emailsSent);
    }

    // Procesar Adelanto + Saldo
    foreach ($adelantoSaldoList as $as) {
        if ($as['adelanto_pagado'] == 0) {
            if ($as['fecha_pago_adelanto'] && $as['fecha_pago_adelanto'] >= $today) {
                $oc_mapped = [
                    'id' => $as['id'],
                    'numero_oc' => $as['numero_oc'],
                    'total' => $as['adelanto_monto'],
                    'monto_movilidad' => 0,
                    'moneda' => $as['moneda'],
                    'fecha_vencimiento' => $as['fecha_pago_adelanto'],
                    'tipo' => $as['tipo'],
                    'proveedor_nombre' => $as['proveedor_nombre'],
                    'is_cuota' => true,
                    'cuota_info' => "Adelanto"
                ];
                processReminder($pdo, $oc_mapped, $today, $treasuryUsers, $notificationsCount, $emailsSent);
            }
        } else {
            if ($as['fecha_pago_saldo_proyectado'] && $as['fecha_pago_saldo_proyectado'] >= $today) {
                $oc_mapped = [
                    'id' => $as['id'],
                    'numero_oc' => $as['numero_oc'],
                    'total' => $as['saldo_monto'],
                    'monto_movilidad' => 0,
                    'moneda' => $as['moneda'],
                    'fecha_vencimiento' => $as['fecha_pago_saldo_proyectado'],
                    'tipo' => $as['tipo'],
                    'proveedor_nombre' => $as['proveedor_nombre'],
                    'is_cuota' => true,
                    'cuota_info' => "Saldo Final"
                ];
                processReminder($pdo, $oc_mapped, $today, $treasuryUsers, $notificationsCount, $emailsSent);
            }
        }
    }

    // 4. Recordatorios de Aprobación de OC/OS (3 días sin respuesta)
    $stmtReminders = $pdo->prepare("
        SELECT id, numero_oc, creado_por, tipo, aprobado_gerente, aprobado_finanzas, created_at, fecha
        FROM ordenes_compra
        WHERE estado = 'Pendiente'
          AND ultimo_recordatorio IS NULL
          AND created_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)
    ");
    $stmtReminders->execute();
    $pendingApprovals = $stmtReminders->fetchAll();
    $remindersSent = 0;

    foreach ($pendingApprovals as $pa) {
        $orden_id = $pa['id'];
        $has_sent_any = false;

        // Recordatorio para Gerente General
        if ($pa['aprobado_gerente'] == 0) {
            $stToken = $pdo->prepare("SELECT token FROM ordenes_compra_tokens WHERE orden_id = ? AND rol = 'gerente_general' AND usado = 0 LIMIT 1");
            $stToken->execute([$orden_id]);
            $tok = $stToken->fetchColumn();
            if ($tok) {
                // Extender expiración del token a 7 días más a partir de ahora
                $pdo->prepare("UPDATE ordenes_compra_tokens SET expiracion = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE token = ?")->execute([$tok]);
                
                try {
                    if (Mailer::sendOCReminderNotification($orden_id, $tok, 'gerente_general')) {
                        $emailsSent++;
                        $remindersSent++;
                        $has_sent_any = true;
                    }
                } catch (Exception $e) {
                    error_log("Error enviando recordatorio Gerente General para OC/OS $orden_id: " . $e->getMessage());
                }
            }
        }

        // Recordatorio para Jefe de Finanzas
        if ($pa['aprobado_finanzas'] == 0) {
            $stToken = $pdo->prepare("SELECT token FROM ordenes_compra_tokens WHERE orden_id = ? AND rol = 'jefe_finanzas' AND usado = 0 LIMIT 1");
            $stToken->execute([$orden_id]);
            $tok = $stToken->fetchColumn();
            if ($tok) {
                // Extender expiración del token a 7 días más a partir de ahora
                $pdo->prepare("UPDATE ordenes_compra_tokens SET expiracion = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE token = ?")->execute([$tok]);
                
                try {
                    if (Mailer::sendOCReminderNotification($orden_id, $tok, 'jefe_finanzas')) {
                        $emailsSent++;
                        $remindersSent++;
                        $has_sent_any = true;
                    }
                } catch (Exception $e) {
                    error_log("Error enviando recordatorio Jefe de Finanzas para OC/OS $orden_id: " . $e->getMessage());
                }
            }
        }

        // Registrar la fecha del último recordatorio
        if ($has_sent_any) {
            $pdo->prepare("UPDATE ordenes_compra SET ultimo_recordatorio = NOW() WHERE id = ?")->execute([$orden_id]);
        }
    }

    if (php_sapi_name() !== 'cli') {
        json_response([
            'ok' => true, 
            'processed_main' => count($purchases),
            'processed_cuotas' => count($cuotas),
            'processed_adelanto_saldo' => count($adelantoSaldoList),
            'processed_reminders' => count($pendingApprovals),
            'notifications_created' => $notificationsCount,
            'emails_sent' => $emailsSent,
            'reminders_sent' => $remindersSent
        ]);
    }

} catch (Exception $e) {
    if (php_sapi_name() !== 'cli') {
        json_response(['error' => $e->getMessage()], 500);
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

/**
 * Función auxiliar para procesar recordatorios y evitar duplicidad
 */
function processReminder($pdo, $oc, $today, $treasuryUsers, &$notificationsCount, &$emailsSent) {
    $venc = $oc['fecha_vencimiento'];
    $diff = (strtotime($venc) - strtotime($today)) / (60 * 60 * 24);
    
    // Solo notificar si faltan 2, 1 o 0 días
    if ($diff >= 0 && $diff <= 2) {
        $daysText = ($diff == 0) ? "vence hoy" : "vence en $diff día(s)";
        $contexto = isset($oc['is_cuota']) ? " ({$oc['cuota_info']})" : "";
        $title = "Recordatorio de Pago$contexto: " . $oc['numero_oc'];
        $msg = "La " . ($oc['tipo'] === 'servicio' ? 'OS' : 'OC') . " " . $oc['numero_oc'] . $contexto . " de " . $oc['proveedor_nombre'] . " $daysText ($venc).";
        
        // --- EVITAR DUPLICADOS ---
        $check = $pdo->prepare("SELECT id FROM notificaciones WHERE mensaje LIKE ? AND DATE(created_at) = ? LIMIT 1");
        $check->execute(["%".$oc['numero_oc']."%".$daysText."%", $today]);
        
        if (!$check->fetch()) {
            foreach ($treasuryUsers as $user) {
                $stNotif = $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)");
                $stNotif->execute([$user['id'], $title, $msg, $diff == 0 ? 'danger' : 'warning']);
                $notificationsCount++;
            }

            try {
                Mailer::sendPaymentReminder($oc, (int)$diff);
                $emailsSent++;
            } catch (Exception $e) {
                error_log("Error enviando recordatorio email: " . $e->getMessage());
            }
        }
    }
}
