<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

$pdo->exec("DROP TABLE IF EXISTS mantenimientos;");

$sql = "
CREATE TABLE mantenimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NULL,
    item_id INT NOT NULL,
    cantidad INT DEFAULT 1,
    proveedor_id INT NULL,
    tipo ENUM('Preventivo', 'Correctivo') DEFAULT 'Correctivo',
    estado ENUM('Pendiente', 'En Proceso', 'Completado', 'Cancelado') DEFAULT 'En Proceso',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    costo DECIMAL(10,2) DEFAULT 0.00,
    descripcion_problema TEXT,
    descripcion_solucion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE SET NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);
    echo "Tabla 'mantenimientos' recreada con el nuevo esquema.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
