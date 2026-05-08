<?php
/**
 * Script de recordatorios de pago para Tesorería.
 * Ejecutar diariamente (Cron Job).
 */

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/mailer.php';

$pdo = db();
$tomorrow = date('Y-m-d', strtotime('+1 day'));

echo "Iniciando proceso de recordatorios para: $tomorrow\n";

// 1. Recordatorios de Crédito Simple
$stmtCredito = $pdo->prepare("
    SELECT oc.*, p.razon_social as proveedor_nombre 
    FROM ordenes_compra oc 
    JOIN proveedores p ON oc.proveedor_id = p.id 
    WHERE oc.condicion_pago = 'Credito' 
    AND oc.pagado = 0 
    AND oc.fecha_vencimiento = ?
");
$stmtCredito->execute([$tomorrow]);
$creditos = $stmtCredito->fetchAll();

foreach ($creditos as $c) {
    echo "Enviando recordatorio Crédito: {$c['numero_oc']}\n";
    Mailer::sendPaymentReminder($c['id'], $c['total'], $tomorrow, "Crédito: " . ($c['condicion_detalle'] ?: 'Sin detalle'));
}

// 2. Recordatorios de Cuotas
$stmtCuotas = $pdo->prepare("
    SELECT c.*, oc.numero_oc, oc.id as orden_id, p.razon_social as proveedor_nombre
    FROM ordenes_cuotas c
    JOIN ordenes_compra oc ON c.orden_id = oc.id
    JOIN proveedores p ON oc.proveedor_id = p.id
    WHERE c.pagado = 0 
    AND c.fecha_vencimiento = ?
");
$stmtCuotas->execute([$tomorrow]);
$cuotas = $stmtCuotas->fetchAll();

foreach ($cuotas as $cu) {
    echo "Enviando recordatorio Cuota {$cu['numero_cuota']}: {$cu['numero_oc']}\n";
    Mailer::sendPaymentReminder($cu['orden_id'], $cu['monto_cuota'], $tomorrow, "Cuota {$cu['numero_cuota']} de {$cu['total_cuotas']}");
}

echo "Proceso finalizado.\n";
