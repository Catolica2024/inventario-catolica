<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Limpiar tablas de inventario
    $pdo->exec("TRUNCATE TABLE movimientos");
    $pdo->exec("TRUNCATE TABLE activos");
    $pdo->exec("TRUNCATE TABLE stock_ubicaciones");
    $pdo->exec("TRUNCATE TABLE items");
    $pdo->exec("TRUNCATE TABLE categorias_inventario");
    
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo json_encode(['ok' => true, 'message' => 'Base de datos de inventario reseteada a 0']);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
