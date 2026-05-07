<?php
// api/assets.php — CRUD de activos individualizados
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $item_id = $_GET['item_id'] ?? null;
                $ubicacion_id = $_GET['ubicacion_id'] ?? null;
                if (!$item_id || !$ubicacion_id) json_response(['error' => 'item_id y ubicacion_id requeridos'], 400);

                // Obtener Prefijo de Categoría
                $item = $pdo->prepare("SELECT i.id, ci.prefijo FROM items i JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id WHERE i.id = ?");
                $item->execute([$item_id]);
                $itemData = $item->fetch();
                $prefix = ($itemData && $itemData['prefijo']) ? $itemData['prefijo'] : 'ACT';

                // Obtener Código de Sede
                $loc = $pdo->prepare("SELECT u.id, s.codigo as sede_codigo FROM ubicaciones u JOIN sedes s ON u.sede_id = s.id WHERE u.id = ?");
                $loc->execute([$ubicacion_id]);
                $locData = $loc->fetch();
                $sede = ($locData && $locData['sede_codigo']) ? $locData['sede_codigo'] : 'C';

                $baseCode = $sede . '-' . $prefix . '-';
                
                // Buscar el correlativo más alto con esa base
                $stmt = $pdo->prepare("SELECT codigo_interno FROM activos WHERE codigo_interno LIKE ? ORDER BY id DESC LIMIT 50");
                $stmt->execute([$baseCode . '%']);
                $rows = $stmt->fetchAll();
                
                $max = 0;
                foreach($rows as $r) {
                    $parts = explode('-', $r['codigo_interno']);
                    $num = intval(end($parts));
                    if ($num > $max) $max = $num;
                }
                
                $next = $baseCode . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }

            $rows = $pdo->query("
                SELECT a.*, i.nombre as item_nombre, i.codigo as item_codigo,
                       ci.nombre as categoria_nombre, u.nombre as ubicacion_nombre
                FROM activos a
                JOIN items i ON a.item_id = i.id
                LEFT JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id
                LEFT JOIN ubicaciones u ON a.ubicacion_id = u.id
                ORDER BY a.id DESC
            ")->fetchAll();
            json_response(['assets' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO activos (numero_serie, codigo_interno, item_id, ubicacion_id, estado) VALUES (?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['numero_serie'],
                $b['codigo_interno'] ?? null,
                $b['item_id'],
                $b['ubicacion_id'] ?: null,
                $b['estado'] ?? 'Operativo'
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE activos SET numero_serie=?, codigo_interno=?, item_id=?, ubicacion_id=?, estado=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['numero_serie'],
                $b['codigo_interno'] ?? null,
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
