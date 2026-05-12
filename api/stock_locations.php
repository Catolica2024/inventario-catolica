<?php
// api/stock_locations.php — Gestión de stock por ubicación (Mobiliario Opción B)
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $item_id = $_GET['item_id'] ?? null;
            if (!$item_id) {
                // Listado general de stock por ubicación
                $stmt = $pdo->query("
                    SELECT sl.*, i.nombre as item_nombre, u.nombre as ubicacion_nombre 
                    FROM stock_ubicaciones sl
                    JOIN items i ON sl.item_id = i.id
                    JOIN ubicaciones u ON sl.ubicacion_id = u.id
                    ORDER BY u.nombre ASC
                ");
                json_response(['stock_locations' => $stmt->fetchAll()]);
            } else {
                // Stock por ubicación para un ítem específico
                $stmt = $pdo->prepare("
                    SELECT sl.*, u.nombre as ubicacion_nombre 
                    FROM stock_ubicaciones sl
                    JOIN ubicaciones u ON sl.ubicacion_id = u.id
                    WHERE sl.item_id = ?
                ");
                $stmt->execute([$item_id]);
                json_response(['locations' => $stmt->fetchAll()]);
            }
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['item_id']) || empty($b['ubicacion_id'])) json_response(['error' => 'Faltan datos'], 400);
            
            $sql = "INSERT INTO stock_ubicaciones (item_id, ubicacion_id, cantidad) 
                    VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$b['item_id'], $b['ubicacion_id'], $b['cantidad'] ?? 0]);
            
            json_response(['ok' => true]);
            break;

        case 'PUT':
            $b = get_body();
            if (empty($b['item_id']) || empty($b['ubicacion_id'])) json_response(['error' => 'Faltan datos'], 400);
            
            $stmt = $pdo->prepare("UPDATE stock_ubicaciones SET cantidad = ? WHERE item_id = ? AND ubicacion_id = ?");
            $stmt->execute([$b['cantidad'], $b['item_id'], $b['ubicacion_id']]);
            
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $item_id = $_GET['item_id'] ?? null;
            $ubicacion_id = $_GET['ubicacion_id'] ?? null;
            if (!$item_id || !$ubicacion_id) json_response(['error' => 'Faltan IDs'], 400);
            
            $stmt = $pdo->prepare("DELETE FROM stock_ubicaciones WHERE item_id = ? AND ubicacion_id = ?");
            $stmt->execute([$item_id, $ubicacion_id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'No soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
