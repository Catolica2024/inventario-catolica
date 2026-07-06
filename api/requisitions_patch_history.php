<?php
// api/requisitions_patch_history.php — Parche para agregar estado Req_Finalizada y columna fecha_finalizacion
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $logs = [];

    // 1. Modificar el ENUM de estado para incluir Req_Finalizada
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("ALTER TABLE ordenes_compra MODIFY COLUMN estado ENUM(
        'Req_Pendiente_Area',
        'Req_Pendiente_Compras',
        'Req_Rechazada',
        'Req_Finalizada',
        'Pendiente',
        'Aprobada',
        'Rechazada',
        'Recibida',
        'Completada'
    ) DEFAULT 'Pendiente';");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    $logs[] = "✅ Estado 'Req_Finalizada' agregado al ENUM de ordenes_compra.estado.";

    // 2. Agregar columna fecha_finalizacion si no existe
    $cols = $pdo->query("SHOW COLUMNS FROM ordenes_compra")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('fecha_finalizacion', $cols)) {
        $pdo->exec("ALTER TABLE ordenes_compra ADD COLUMN fecha_finalizacion DATETIME NULL DEFAULT NULL AFTER fecha_envio_requisicion");
        $logs[] = "✅ Columna 'fecha_finalizacion' agregada a ordenes_compra.";
    } else {
        $logs[] = "ℹ️ Columna 'fecha_finalizacion' ya existe.";
    }

    echo json_encode([
        'ok'     => true,
        'mensaje'=> 'Parche de historial de requisiciones aplicado correctamente.',
        'logs'   => $logs
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode([
        'ok'    => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
