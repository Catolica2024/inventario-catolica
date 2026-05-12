<?php
// api/maintenance.php — Gestión de reparaciones y soporte
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("
                SELECT m.*, i.nombre as item_nombre, 
                       a.numero_serie, a.codigo_interno as activo_codigo,
                       p.razon_social as proveedor_nombre
                FROM mantenimientos m
                JOIN items i ON m.item_id = i.id
                LEFT JOIN activos a ON m.activo_id = a.id
                LEFT JOIN proveedores p ON m.proveedor_id = p.id
                ORDER BY m.fecha_inicio DESC, m.id DESC
            ");
            json_response(['maintenance' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $b = get_body();
            if (!isset($b['item_id'], $b['fecha_inicio'], $b['descripcion_problema'])) {
                json_response(['error' => 'Datos incompletos'], 400);
            }

            $pdo->beginTransaction();
            try {
                // 1. Registrar mantenimiento
                $sql = "INSERT INTO mantenimientos (activo_id, item_id, cantidad, proveedor_id, tipo, estado, fecha_inicio, descripcion_problema, costo) 
                        VALUES (?,?,?,?,?,?,?,?,?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['activo_id'] ?: null,
                    $b['item_id'],
                    $b['cantidad'] ?? 1,
                    $b['proveedor_id'] ?: null,
                    $b['tipo'] ?? 'Correctivo',
                    $b['estado'] ?? 'En Proceso',
                    $b['fecha_inicio'],
                    $b['descripcion_problema'],
                    $b['costo'] ?? 0
                ]);
                $maintId = $pdo->lastInsertId();

                // 2. Si es un activo específico, actualizar su estado
                if (!empty($b['activo_id'])) {
                    $pdo->prepare("UPDATE activos SET estado = 'En Mantenimiento' WHERE id = ?")->execute([$b['activo_id']]);
                }

                // 3. Registrar movimiento de salida de stock (Almacén ID 13)
                $ALMACEN_ID = 13;
                $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Salida', ?, ?, ?)");
                $obs = "Mantenimiento " . ($b['tipo'] ?? 'Correctivo') . ": " . ($b['descripcion_problema']);
                $stmtMov->execute([$b['item_id'], $b['cantidad'] ?? 1, $ALMACEN_ID, $obs]);

                $pdo->commit();
                json_response(['ok' => true, 'id' => $maintId]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'PUT':
            $b = get_body();
            if (!isset($b['id'], $b['estado'])) {
                json_response(['error' => 'ID y estado requeridos'], 400);
            }

            $pdo->beginTransaction();
            try {
                // Obtener datos actuales
                $stmtCheck = $pdo->prepare("SELECT * FROM mantenimientos WHERE id = ?");
                $stmtCheck->execute([$b['id']]);
                $maint = $stmtCheck->fetch();
                if (!$maint) throw new Exception("Registro no encontrado");

                // Actualizar registro
                $sql = "UPDATE mantenimientos SET estado = ?, fecha_fin = ?, costo = ?, descripcion_solucion = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['estado'],
                    $b['fecha_fin'] ?? date('Y-m-d'),
                    $b['costo'] ?? $maint['costo'],
                    $b['descripcion_solucion'] ?? null,
                    $b['id']
                ]);

                // Si se completa o cancela, devolver al stock
                if ($b['estado'] === 'Completado' || $b['estado'] === 'Cancelado') {
                    // Si era un activo, volver a Operativo
                    if ($maint['activo_id']) {
                        $pdo->prepare("UPDATE activos SET estado = 'Operativo' WHERE id = ?")->execute([$maint['activo_id']]);
                    }

                    // Registrar entrada de vuelta al stock (Almacén ID 13)
                    $ALMACEN_ID = 13;
                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
                    $obs = "Retorno de Mantenimiento (ID: ".$b['id'].")";
                    $stmtMov->execute([$maint['item_id'], $maint['cantidad'], $ALMACEN_ID, $obs]);
                }

                $pdo->commit();
                json_response(['ok' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM mantenimientos WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
