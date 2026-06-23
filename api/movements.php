<?php
// api/movements.php — Registro de movimientos de stock
ob_start();
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $sql = "
                SELECT m.*, i.nombre as item_nombre, 
                       c.tipo as categoria_tipo,
                       p1.nombre as responsable_nombre,
                       p2.nombre as destinatario_nombre,
                       p3.nombre as despachado_por_nombre,
                       u.nombre as ubicacion_nombre
                FROM movimientos m
                JOIN items i ON m.item_id = i.id
                LEFT JOIN categorias_inventario c ON i.categoria_inventario_id = c.id
                LEFT JOIN personal p1 ON m.responsable_id = p1.id
                LEFT JOIN personal p2 ON m.personal_destinatario_id = p2.id
                LEFT JOIN personal p3 ON m.despachado_por_id = p3.id
                LEFT JOIN ubicaciones u ON m.ubicacion_id = u.id
                ORDER BY m.fecha DESC
            ";
            $rows = $pdo->query($sql)->fetchAll();
            ob_clean();
            json_response(['movements' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            if (!isset($b['item_id'], $b['tipo'], $b['cantidad'])) {
                ob_clean();
                json_response(['error' => 'Datos incompletos'], 400);
            }
            
            $sql = "INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, personal_destinatario_id, despachado_por_id, responsable_id, observacion, foto_url) VALUES (?,?,?,?,?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['item_id'],
                $b['tipo'],
                $b['cantidad'],
                (!empty($b['ubicacion_id'])) ? $b['ubicacion_id'] : null,
                (!empty($b['personal_destinatario_id'])) ? $b['personal_destinatario_id'] : null,
                (!empty($b['despachado_por_id'])) ? $b['despachado_por_id'] : null,
                (!empty($b['responsable_id'])) ? $b['responsable_id'] : null,
                (!empty($b['observacion'])) ? $b['observacion'] : null,
                (!empty($b['foto_url'])) ? $b['foto_url'] : null
            ]);
            
            ob_clean();
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                ob_clean();
                json_response(['error' => 'ID requerido'], 400);
            }
            $pdo->prepare("DELETE FROM movimientos WHERE id = ?")->execute([$id]);
            ob_clean();
            json_response(['ok' => true]);
            break;

        default:
            ob_clean();
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    ob_clean();
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
