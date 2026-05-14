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

    if (php_sapi_name() !== 'cli') {
        json_response([
            'ok' => true, 
            'processed_main' => count($purchases),
            'processed_cuotas' => count($cuotas),
            'notifications_created' => $notificationsCount,
            'emails_sent' => $emailsSent
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
        $check = $pdo->prepare("SELECT id FROM notificaciones WHERE mensaje LIKE ? AND DATE(fecha) = ? LIMIT 1");
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
