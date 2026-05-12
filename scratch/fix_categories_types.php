<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // 1. Corregir tipos mal escritos o vacíos
    $pdo->exec("UPDATE categorias_inventario SET tipo = 'equipo' WHERE tipo = 'activo'");
    $pdo->exec("UPDATE categorias_inventario SET tipo = 'mobiliario' WHERE nombre IN ('Escritorios', 'Sillas') AND (tipo = '' OR tipo IS NULL)");
    $pdo->exec("UPDATE categorias_inventario SET tipo = 'equipo' WHERE nombre = 'Monitores'");
    
    // 2. Asegurarse de que no haya tipos vacíos (poner insumo por defecto)
    $pdo->exec("UPDATE categorias_inventario SET tipo = 'insumo' WHERE tipo = '' OR tipo IS NULL");

    echo json_encode(['ok' => true, 'message' => 'Categorías corregidas con éxito']);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
