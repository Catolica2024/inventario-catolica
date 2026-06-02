<?php
// api/items.php — CRUD de ítems
ob_start(); // Capturar warnings antes del JSON
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

                // Obtener TODOS los códigos existentes con este prefijo
                $rows = $pdo->prepare("SELECT codigo FROM items WHERE codigo LIKE ?");
                $rows->execute([$prefix . '-%']);
                $data = $rows->fetchAll();

                // Construir un set de números ya usados
                $used = [];
                foreach ($data as $row) {
                    $parts = explode('-', $row['codigo']);
                    $n = intval(end($parts));
                    if ($n > 0) $used[] = $n;
                }

                // Buscar el PRIMER hueco disponible desde 1
                $next_num = 1;
                while (in_array($next_num, $used)) {
                    $next_num++;
                }

                $next = $prefix . '-' . str_pad($next_num, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $stmt = $pdo->query("
                SELECT i.*, c.nombre as categoria_nombre, c.tipo as categoria_tipo, c.stock_minimo as categoria_stock_minimo,
                       (SELECT COALESCE(SUM(CASE 
                            WHEN m.tipo = 'Entrada' THEN m.cantidad 
                            WHEN m.tipo IN ('Salida', 'Baja') THEN -m.cantidad 
                            ELSE 0 END), 0) 
                        FROM movimientos m WHERE m.item_id = i.id) as stock_actual,
                       (SELECT COALESCE(SUM(m.cantidad), 0) FROM movimientos m WHERE m.item_id = i.id AND m.tipo = 'Entrada') as stock_total,
                       (SELECT COALESCE(SUM(m.cantidad), 0) FROM movimientos m WHERE m.item_id = i.id AND m.tipo IN ('Salida','Baja')) as stock_salido,
                       (SELECT COUNT(DISTINCT m.ubicacion_id) FROM movimientos m WHERE m.item_id = i.id AND m.ubicacion_id IS NOT NULL) as num_ubicaciones,
                       (SELECT u.nombre FROM movimientos m 
                        JOIN ubicaciones u ON u.id = m.ubicacion_id 
                        WHERE m.item_id = i.id AND m.ubicacion_id IS NOT NULL 
                        ORDER BY m.id DESC LIMIT 1) as ubicacion_nombre,
                       (SELECT s.nombre FROM movimientos m 
                        JOIN ubicaciones u ON u.id = m.ubicacion_id 
                        JOIN sedes s ON s.id = u.sede_id 
                        WHERE m.item_id = i.id AND m.ubicacion_id IS NOT NULL 
                        ORDER BY m.id DESC LIMIT 1) as sede_nombre
                FROM items i 
                LEFT JOIN categorias_inventario c ON i.categoria_inventario_id = c.id 
                ORDER BY i.id DESC
            ");
            $rows = $stmt->fetchAll();
            json_response(['items' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            $pdo->beginTransaction();
            try {
                $sql = "INSERT INTO items (codigo, nombre, marca, modelo, categoria_inventario_id, stock_minimo, unidad_medida, unidad_compra, factor_conversion) VALUES (?,?,?,?,?,?,?,?,?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['codigo'] ?? null,
                    $b['nombre'],
                    $b['marca'] ?? null,
                    $b['modelo'] ?? null,
                    $b['categoria_inventario_id'] ?? null,
                    $b['stock_minimo'] ?? 0,
                    $b['unidad_medida'] ?? 'Unidad',
                    $b['unidad_compra'] ?? 'Unidad',
                    $b['factor_conversion'] ?? 1.00
                ]);
                $itemId = $pdo->lastInsertId();

                $pdo->commit();
                ob_clean();
                json_response(['ok' => true, 'id' => $itemId]);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'PUT':
            $b = get_body();
            if (!isset($b['id'])) json_response(['error' => 'ID requerido'], 400);
            $sql = "UPDATE items SET codigo=?, nombre=?, marca=?, modelo=?, categoria_inventario_id=?, stock_minimo=?, unidad_medida=?, unidad_compra=?, factor_conversion=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['marca'] ?? null,
                $b['modelo'] ?? null,
                $b['categoria_inventario_id'] ?? null,
                $b['stock_minimo'] ?? 0,
                $b['unidad_medida'] ?? 'Unidad',
                $b['unidad_compra'] ?? 'Unidad',
                $b['factor_conversion'] ?? 1.00,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $force = isset($_GET['force']) && $_GET['force'] == '1';
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            // Modo force: eliminación en cascada (usado solo para rollback automático)
            if ($force) {
                $pdo->prepare("DELETE FROM movimientos WHERE item_id = ?")->execute([$id]);
                $pdo->prepare("DELETE FROM activos WHERE item_id = ?")->execute([$id]);
                $pdo->prepare("DELETE FROM items WHERE id = ?")->execute([$id]);
                json_response(['ok' => true]);
                break;
            }

            // Modo normal: verificar dependencias específicas para dar un error detallado
            $deps = [];
            
            $stmtMovs = $pdo->prepare("SELECT COUNT(*) FROM movimientos WHERE item_id = ?");
            $stmtMovs->execute([$id]);
            $c = $stmtMovs->fetchColumn();
            if ($c > 0) $deps[] = "$c movimiento(s) de stock";

            $stmtActivos = $pdo->prepare("SELECT COUNT(*) FROM activos WHERE item_id = ?");
            $stmtActivos->execute([$id]);
            $c = $stmtActivos->fetchColumn();
            if ($c > 0) $deps[] = "$c unidad(es) en Equipos";

            $stmtStock = $pdo->prepare("SELECT COUNT(*) FROM stock_ubicaciones WHERE item_id = ?");
            $stmtStock->execute([$id]);
            $c = $stmtStock->fetchColumn();
            if ($c > 0) $deps[] = "$c asignación(es) a Aulas/Mobiliario";

            $stmtOc = $pdo->prepare("SELECT COUNT(*) FROM ordenes_compra_items WHERE item_id = ?");
            $stmtOc->execute([$id]);
            $c = $stmtOc->fetchColumn();
            if ($c > 0) $deps[] = "$c registro(s) en Órdenes de Compra";

            if (!empty($deps)) {
                $msg = "No se puede eliminar el artículo porque tiene: " . implode(", ", $deps) . ". Debe eliminar estos registros primero.";
                json_response(['error' => $msg], 400);
                break;
            }

            $stmt = $pdo->prepare("DELETE FROM items WHERE id = ?");
            $stmt->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    ob_clean();
    if ($e instanceof PDOException && $e->getCode() == '23000') {
        json_response(['error' => 'No se puede eliminar el artículo porque tiene registros asociados (movimientos, activos o compras). Elimine esos registros primero.'], 400);
    }
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
