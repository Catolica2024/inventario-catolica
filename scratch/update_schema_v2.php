<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // 1. Agregar personal_id a activos si no existe
    $cols = $pdo->query("SHOW COLUMNS FROM activos LIKE 'personal_id'")->fetch();
    if (!$cols) {
        $pdo->exec("ALTER TABLE activos ADD COLUMN personal_id INT NULL AFTER ubicacion_id");
        $pdo->exec("ALTER TABLE activos ADD FOREIGN KEY (personal_id) REFERENCES personal(id)");
        echo "Columna personal_id agregada a activos.\n";
    }

    // 2. Crear tabla para stock por ubicación (Mobiliario)
    $pdo->exec("CREATE TABLE IF NOT EXISTS stock_ubicaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        ubicacion_id INT NOT NULL,
        cantidad INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
        UNIQUE KEY item_ubicacion (item_id, ubicacion_id)
    )");
    echo "Tabla stock_ubicaciones creada/verificada.\n";
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}
