<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
try {
    // Agregar columna ubicacion_id a movimientos
    $pdo->exec("ALTER TABLE movimientos ADD COLUMN ubicacion_id INT NULL AFTER cantidad, ADD FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE SET NULL");
    echo "OK: Columna ubicacion_id añadida a movimientos.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "OK: La columna ya existe.\n";
    } else {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}
