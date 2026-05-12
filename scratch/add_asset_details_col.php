<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $pdo->exec("ALTER TABLE activos ADD COLUMN observaciones_tecnicas TEXT AFTER estado");
    echo json_encode(['ok' => true, 'message' => 'Columna observaciones_tecnicas añadida a la tabla activos']);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
