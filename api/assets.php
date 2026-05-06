<?php
// api/assets.php — CRUD de activos individualizados
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("
                SELECT a.*, i.nombre as item_nombre, i.codigo as item_codigo,
                       c.nombre as categoria_nombre, u.nombre as ubicacion_nombre
                FROM activos a
                JOIN items i ON a.item_id = i.id
                LEFT JOIN categorias c ON i.categoria_id = c.id
                LEFT JOIN ubicaciones u ON a.ubicacion_id = u.id
                ORDER BY a.id DESC
            ")->fetchAll();
            json_response(['assets' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO activos (numero_serie, item_id, ubicacion_id, estado) VALUES (?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['numero_serie'],
                $b['item_id'],
                $b['ubicacion_id'] ?: null,
                $b['estado'] ?? 'Operativo'
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE activos SET numero_serie=?, item_id=?, ubicacion_id=?, estado=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['numero_serie'],
                $b['item_id'],
                $b['ubicacion_id'] ?: null,
                $b['estado'] ?? 'Operativo',
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM activos WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
