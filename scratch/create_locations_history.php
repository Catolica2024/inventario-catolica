<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // Crear tabla de historial si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS ubicaciones_historial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ubicacion_id INT NOT NULL,
        tipo VARCHAR(50),
        responsable_id INT,
        fecha_desde DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_hasta DATETIME NULL,
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE CASCADE
    )");

    echo "Tabla 'ubicaciones_historial' creada o ya existente.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
