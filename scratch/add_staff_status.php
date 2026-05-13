<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $pdo->exec("ALTER TABLE personal ADD COLUMN estado ENUM('activo', 'inactivo') DEFAULT 'activo' AFTER telefono");
    echo "Columna 'estado' añadida a la tabla 'personal' correctamente.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
