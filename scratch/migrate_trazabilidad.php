<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

$steps = [];

// 1. Tabla asignaciones (equipos)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS asignaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activo_id INT NOT NULL,
        personal_id INT NOT NULL,
        fecha_asignacion DATE NOT NULL,
        fecha_devolucion DATE NULL,
        estado ENUM('Activo','Devuelto','Extraviado') DEFAULT 'Activo',
        condicion_entrega VARCHAR(100) DEFAULT 'Bueno',
        condicion_devolucion VARCHAR(100) NULL,
        observaciones TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE CASCADE,
        FOREIGN KEY (personal_id) REFERENCES personal(id)
    )");
    $steps[] = "OK: Tabla 'asignaciones' creada.";
} catch(Exception $e) { $steps[] = "ERROR asignaciones: " . $e->getMessage(); }

// 2. Tabla traslados (mobiliario)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS traslados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        ubicacion_origen_id INT NULL,
        ubicacion_destino_id INT NOT NULL,
        cantidad INT NOT NULL DEFAULT 1,
        fecha DATE NOT NULL,
        responsable_id INT NULL,
        motivo VARCHAR(255) NULL,
        observaciones TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id) ON DELETE SET NULL,
        FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (responsable_id) REFERENCES personal(id) ON DELETE SET NULL
    )");
    $steps[] = "OK: Tabla 'traslados' creada.";
} catch(Exception $e) { $steps[] = "ERROR traslados: " . $e->getMessage(); }

// 3. Mejorar tabla movimientos (insumos) con destinatario y quién despacha
$cols = array_column($pdo->query("DESCRIBE movimientos")->fetchAll(), 'Field');
if (!in_array('personal_destinatario_id', $cols)) {
    try {
        $pdo->exec("ALTER TABLE movimientos ADD COLUMN personal_destinatario_id INT NULL AFTER ubicacion_id,
                    ADD COLUMN despachado_por_id INT NULL AFTER personal_destinatario_id,
                    ADD FOREIGN KEY (personal_destinatario_id) REFERENCES personal(id) ON DELETE SET NULL,
                    ADD FOREIGN KEY (despachado_por_id) REFERENCES personal(id) ON DELETE SET NULL");
        $steps[] = "OK: Columnas 'personal_destinatario_id' y 'despachado_por_id' añadidas a movimientos.";
    } catch(Exception $e) { $steps[] = "ERROR movimientos: " . $e->getMessage(); }
} else {
    $steps[] = "OK: Columnas de movimientos ya existían.";
}

foreach($steps as $s) echo $s . "\n";
echo "\nMigración completada.\n";
