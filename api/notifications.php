<?php
// api/notifications.php — Sistema de Notificaciones Inteligentes
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    $usuario_id = $_GET['usuario_id'] ?? null;

    if (isset($_GET['action']) && $_GET['action'] === 'check_stock') {
        // --- LOGICA PROACTIVA: VERIFICAR STOCK BAJO ---
        // Buscamos items cuyo stock actual sea menor al mínimo de su categoría
        $lowStockItems = $pdo->query("
            SELECT i.id, i.nombre, c.stock_minimo as min_cat, 
                   (COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END), 0)) as stock_actual
            FROM items i
            JOIN categorias_inventario c ON i.categoria_inventario_id = c.id
            LEFT JOIN movimientos m ON i.id = m.item_id
            GROUP BY i.id
            HAVING stock_actual < min_cat
        ")->fetchAll();

        foreach ($lowStockItems as $item) {
            $msg = "ALERTA DE STOCK: El ítem '" . $item['nombre'] . "' está bajo el mínimo (Actual: " . $item['stock_actual'] . " | Mín: " . $item['min_cat'] . ")";
            
            // Verificar si ya existe una notificación activa idéntica para evitar spam
            $check = $pdo->prepare("SELECT id FROM notificaciones WHERE mensaje = ? AND leido = 0 LIMIT 1");
            $check->execute([$msg]);
            
            if (!$check->fetch()) {
                // Notificar a todos los administradores (id_rol = 1)
                $admins = $pdo->query("SELECT id FROM usuarios WHERE id_rol = 1")->fetchAll();
                foreach ($admins as $admin) {
                    $stmt = $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Bajo Stock', ?, 'warning')");
                    $stmt->execute([$admin['id'], $msg]);
                }
            }
        }
        json_response(['ok' => true, 'checked' => count($lowStockItems)]);
        exit;
    }

    switch ($method) {
        case 'GET':
            if (!$usuario_id) json_response(['notifications' => []]);
            $rows = $pdo->prepare("SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 50");
            $rows->execute([$usuario_id]);
            json_response(['notifications' => $rows->fetchAll()]);
            break;

        case 'PUT':
            $b = get_body();
            if (isset($b['id'])) {
                $pdo->prepare("UPDATE notificaciones SET leido = 1 WHERE id = ?")->execute([$b['id']]);
            } else if ($usuario_id) {
                $pdo->prepare("UPDATE notificaciones SET leido = 1 WHERE usuario_id = ?")->execute([$usuario_id]);
            }
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM notificaciones WHERE id = ?")->execute([$id]);
            }
            json_response(['ok' => true]);
            break;
    }
} catch (Exception $e) {
    json_response(['error' => $e->getMessage()], 500);
}
