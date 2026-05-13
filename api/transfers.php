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
                LEFT JOIN ubicaciones u2 ON t.ubicacion_destino_id = u2.id
                LEFT JOIN personal p ON t.responsable_id = p.id
                ORDER BY t.fecha DESC, t.id DESC
            ");
            json_response(['transfers' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $b = get_body();
            $isBaja = (isset($b['tipo']) && $b['tipo'] === 'Baja');
            $isEntrada = (isset($b['tipo']) && $b['tipo'] === 'Entrada');

            if (!isset($b['item_id'], $b['cantidad'], $b['fecha']) || (!$isBaja && !isset($b['ubicacion_destino_id']))) {
                json_response(['error' => 'Datos incompletos'], 400);
            }

            $pdo->beginTransaction();
            try {
                // 1. Registrar traslado con tipo
                $sql = "INSERT INTO traslados (item_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, fecha, responsable_id, motivo, observaciones, tipo) VALUES (?,?,?,?,?,?,?,?,?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['item_id'],
                    (!empty($b['ubicacion_origen_id'])) ? $b['ubicacion_origen_id'] : null,
                    ($isBaja) ? null : $b['ubicacion_destino_id'],
                    $b['cantidad'],
                    $b['fecha'],
                    (!empty($b['responsable_id'])) ? $b['responsable_id'] : null,
                    $b['motivo'] ?? ($isBaja ? 'BAJA DEFINITIVA' : null),
                    $b['observaciones'] ?? null,
                    $b['tipo'] ?? 'Salida'
                ]);

                // 2. REGISTRAR MOVIMIENTOS DE STOCK (DINÁMICO SEGÚN TIPO DE UBICACIÓN)
                // Obtenemos todos los IDs que son tipo 'Depósito'
                $stmtDep = $pdo->query("SELECT id FROM ubicaciones WHERE tipo = 'Depósito'");
                $depositoIds = $stmtDep->fetchAll(PDO::FETCH_COLUMN);
                
                $ALMACEN_DEFECTO_ID = 13; // Almacén 1 por defecto
                $item_id = $b['item_id'];
                $cantidad = $b['cantidad'];
                
                $origen_id = !empty($b['ubicacion_origen_id']) ? (int)$b['ubicacion_origen_id'] : $ALMACEN_DEFECTO_ID;
                $destino_id = !empty($b['ubicacion_destino_id']) ? (int)$b['ubicacion_destino_id'] : ($isBaja ? null : $ALMACEN_DEFECTO_ID);
                
                $origenEsDeposito = in_array($origen_id, $depositoIds);
                $destinoEsDeposito = $destino_id !== null && in_array($destino_id, $depositoIds);
                
                $isReturnBaja = !empty($b['is_return_baja']);

                if ($isReturnBaja) {
                    // Caso: Se devuelve algo desde un espacio pero como BAJA.
                } elseif ($isBaja) {
                    // Caso: Baja directa. Si el origen es un depósito, descontamos stock.
                    if ($origenEsDeposito) {
                        $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Baja', ?, ?, ?)");
                        $stmtMov->execute([$item_id, $cantidad, $origen_id, $b['motivo'] ?? "BAJA POR DAÑO/OBSOLESCENCIA"]);
                    }
                } elseif ($origenEsDeposito && !$destinoEsDeposito) {
                    // Caso: Sale de un Depósito a un Espacio -> SALIDA (Descuenta stock)
                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Salida', ?, ?, ?)");
                    $stmtMov->execute([$item_id, $cantidad, $origen_id, $b['motivo'] ?? "Traslado a ubicación"]);
                } elseif (!$origenEsDeposito && $destinoEsDeposito) {
                    // Caso: Retorna de un Espacio a un Depósito -> ENTRADA (Suma stock)
                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
                    $stmtMov->execute([$item_id, $cantidad, $destino_id, $b['motivo'] ?? "Retorno al almacén"]);
                }
                // Si es entre depósitos o entre espacios, no afecta al stock global "disponible" (Entrada - Salida).

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
