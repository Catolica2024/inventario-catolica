<?php
// api/items.php — CRUD de ítems
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            // Acción especial: siguiente código de ítem disponible
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $cat_id = $_GET['categoria_id'] ?? null;
                if (!$cat_id) json_response(['error' => 'categoria_id requerido'], 400);

                // Obtener prefijo de la categoría
                $stmtCat = $pdo->prepare("SELECT prefijo FROM categorias_inventario WHERE id = ?");
                $stmtCat->execute([$cat_id]);
                $cat = $stmtCat->fetch();
                $prefix = ($cat && $cat['prefijo']) ? $cat['prefijo'] : 'ITM';

                $rows = $pdo->prepare("SELECT codigo FROM items WHERE codigo LIKE ? ORDER BY id DESC LIMIT 50");
                $rows->execute([$prefix . '-%']);
                $data = $rows->fetchAll();

                $max = 0;
                foreach ($data as $row) {
                    $parts = explode('-', $row['codigo']);
                    $n = intval(end($parts));
                    if ($n > $max) $max = $n;
                }
                $next = $prefix . '-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $stmt = $pdo->query("
                SELECT i.*, c.nombre as categoria_nombre 
                FROM items i 
                LEFT JOIN categorias_inventario c ON i.categoria_inventario_id = c.id 
                ORDER BY i.id DESC
            ");
            $rows = $stmt->fetchAll();
            json_response(['items' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO items (codigo, nombre, marca, modelo, categoria_inventario_id, stock_minimo) VALUES (?,?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['marca'] ?? null,
                $b['modelo'] ?? null,
                $b['categoria_inventario_id'] ?? null,
                $b['stock_minimo'] ?? 0
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            if (!isset($b['id'])) json_response(['error' => 'ID requerido'], 400);
            $sql = "UPDATE items SET codigo=?, nombre=?, marca=?, modelo=?, categoria_inventario_id=?, stock_minimo=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['marca'] ?? null,
                $b['modelo'] ?? null,
                $b['categoria_inventario_id'] ?? null,
                $b['stock_minimo'] ?? 0,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $stmt = $pdo->prepare("DELETE FROM items WHERE id = ?");
            $stmt->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
