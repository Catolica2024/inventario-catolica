<?php
// api/system.php — Acciones administrativas de sistema
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    if ($method === 'POST') {
        $b = get_body();
        $action = $b['action'] ?? null;
        
        // Solo para administradores (id 1 en roles)
        // En un sistema real, aquí verificaríamos la sesión
        
        if ($action === 'reset_inventory') {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            $pdo->exec("DELETE FROM movimientos");
            $pdo->exec("DELETE FROM activos");
            $pdo->exec("DELETE FROM stock_ubicaciones");
            $pdo->exec("DELETE FROM ordenes_compra_items");
            $pdo->exec("DELETE FROM items");
            $pdo->exec("ALTER TABLE items AUTO_INCREMENT = 1");
            $pdo->exec("ALTER TABLE movimientos AUTO_INCREMENT = 1");
            $pdo->exec("ALTER TABLE activos AUTO_INCREMENT = 1");
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            json_response(['ok' => true, 'message' => 'Inventario reiniciado correctamente']);
        } else {
            json_response(['error' => 'Acción no válida'], 400);
        }
    }
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
