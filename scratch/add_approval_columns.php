<?php

try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3307;dbname=catolica_school;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Check if columns exist
    $cols = $pdo->query("SHOW COLUMNS FROM ordenes_compra")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('fecha_aprobacion_gerente', $cols)) {
        $pdo->exec("ALTER TABLE ordenes_compra ADD COLUMN fecha_aprobacion_gerente datetime DEFAULT NULL AFTER aprobado_gerente");
        echo "Columna fecha_aprobacion_gerente agregada.\n";
    } else {
        echo "Columna fecha_aprobacion_gerente ya existe.\n";
    }
    
    if (!in_array('fecha_aprobacion_finanzas', $cols)) {
        $pdo->exec("ALTER TABLE ordenes_compra ADD COLUMN fecha_aprobacion_finanzas datetime DEFAULT NULL AFTER aprobado_finanzas");
        echo "Columna fecha_aprobacion_finanzas agregada.\n";
    } else {
        echo "Columna fecha_aprobacion_finanzas ya existe.\n";
    }
    
    if (!in_array('fecha_aprobacion', $cols)) {
        $pdo->exec("ALTER TABLE ordenes_compra ADD COLUMN fecha_aprobacion datetime DEFAULT NULL AFTER estado");
        echo "Columna fecha_aprobacion agregada.\n";
    } else {
        echo "Columna fecha_aprobacion ya existe.\n";
    }
    
    echo "¡Listo! Columnas verificadas y creadas en base de datos local.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
