<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
try {
    // 1. Nos aseguramos de que no haya prefijos nulos
    $pdo->exec("UPDATE categorias_inventario SET prefijo = SUBSTRING(nombre, 1, 3) WHERE prefijo IS NULL");
    
    // 2. Pasamos todos los prefijos a mayúsculas
    $pdo->exec("UPDATE categorias_inventario SET prefijo = UPPER(prefijo)");

    // 3. Eliminamos la columna 'codigo' que ya no usaremos
    // Primero verificamos si existe para evitar errores
    $cols = $pdo->query("DESCRIBE categorias_inventario")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('codigo', $cols)) {
        $pdo->exec("ALTER TABLE categorias_inventario DROP COLUMN codigo");
    }

    // 4. Marcamos 'prefijo' como UNIQUE y NOT NULL
    $pdo->exec("ALTER TABLE categorias_inventario MODIFY prefijo VARCHAR(10) NOT NULL UNIQUE");
    
    echo "OK: Base de datos actualizada. El PREFIJO es ahora el único código identificador.";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
