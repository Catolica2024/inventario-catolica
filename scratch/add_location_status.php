<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $pdo->exec("ALTER TABLE ubicaciones ADD COLUMN estado ENUM('activo', 'inactivo') DEFAULT 'activo' AFTER sede_id");
    echo "Columna 'estado' añadida a la tabla 'ubicaciones' correctamente.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
