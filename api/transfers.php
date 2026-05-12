<?php
// api/transfers.php — Registro de traslados de mobiliario
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("
                SELECT t.*, i.nombre as item_nombre, 
                       u1.nombre as origen_nombre, u2.nombre as destino_nombre,
                       p.nombre as responsable_nombre
                FROM traslados t
                JOIN items i ON t.item_id = i.id
                LEFT JOIN ubicaciones u1 ON t.ubicacion_origen_id = u1.id
                JOIN ubicaciones u2 ON t.ubicacion_destino_id = u2.id
                LEFT JOIN personal p ON t.responsable_id = p.id
                ORDER BY t.fecha DESC, t.id DESC
            ");
            json_response(['transfers' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $b = get_body();
            if (!isset($b['item_id'], $b['ubicacion_destino_id'], $b['cantidad'], $b['fecha'])) {
                json_response(['error' => 'Datos incompletos'], 400);
            }

            $pdo->beginTransaction();
            try {
                // 1. Registrar traslado
                $sql = "INSERT INTO traslados (item_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, fecha, responsable_id, motivo, observaciones) VALUES (?,?,?,?,?,?,?,?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['item_id'],
                    (!empty($b['ubicacion_origen_id'])) ? $b['ubicacion_origen_id'] : null,
                    $b['ubicacion_destino_id'],
                    $b['cantidad'],
                    $b['fecha'],
                    (!empty($b['responsable_id'])) ? $b['responsable_id'] : null,
                    (!empty($b['motivo'])) ? $b['motivo'] : null,
                    (!empty($b['observaciones'])) ? $b['observaciones'] : null
                ]);

                // 2. REGISTRAR MOVIMIENTOS DE STOCK SI CORRESPONDE (Almacén ID: 13)
                $ALMACEN_ID = 13;
                $item_id = $b['item_id'];
                $cantidad = $b['cantidad'];
                
                // Si sale del almacén -> Salida
                if ($b['ubicacion_origen_id'] == $ALMACEN_ID && $b['ubicacion_destino_id'] != $ALMACEN_ID) {
                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Salida', ?, ?, ?)");
                    $stmtMov->execute([$item_id, $cantidad, $ALMACEN_ID, "Traslado desde Almacén"]);
                } 
                // Si entra al almacén desde otro lado -> Entrada
                else if ($b['ubicacion_origen_id'] != $ALMACEN_ID && $b['ubicacion_destino_id'] == $ALMACEN_ID) {
                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
                    $stmtMov->execute([$item_id, $cantidad, $ALMACEN_ID, "Retorno al Almacén"]);
                }
                // Si el origen era Almacén Principal (vacio en el modal) y el destino no
                else if (empty($b['ubicacion_origen_id']) && $b['ubicacion_destino_id'] != $ALMACEN_ID) {
                     $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Salida', ?, ?, ?)");
                     $stmtMov->execute([$item_id, $cantidad, $ALMACEN_ID, "Traslado desde Almacén (Principal)"]);
                }

                $pdo->commit();
                json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM traslados WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
