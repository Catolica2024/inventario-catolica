<?php
// api/requisitions_patch_dates.php — Parche para agregar columnas de fechas de envío y aprobación de director
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $logs = [];

    // Modificar ordenes_compra para añadir fecha_envio_requisicion y fecha_aprobacion_director
    $cols = $pdo->query("SHOW COLUMNS FROM ordenes_compra")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('fecha_envio_requisicion', $cols)) {
        $pdo->exec("ALTER TABLE ordenes_compra ADD COLUMN fecha_envio_requisicion DATETIME NULL DEFAULT NULL");
        $logs[] = "➕ Columna fecha_envio_requisicion agregada a 'ordenes_compra'.";
    }

    if (!in_array('fecha_aprobacion_director', $cols)) {
        $pdo->exec("ALTER TABLE ordenes_compra ADD COLUMN fecha_aprobacion_director DATETIME NULL DEFAULT NULL");
        $logs[] = "➕ Columna fecha_aprobacion_director agregada a 'ordenes_compra'.";
    }

    echo json_encode([
        'ok' => true,
        'mensaje' => 'Parche de fechas de requisiciones aplicado correctamente.',
        'logs' => $logs
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
