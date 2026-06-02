<?php
// api/assignments.php — Gestión de asignaciones de equipos
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $activo_id = $_GET['activo_id'] ?? null;
            $sql = "
                SELECT a.*, p.nombre as personal_nombre, i.nombre as activo_nombre, i.codigo as activo_codigo
                FROM asignaciones a
                JOIN activos ac ON a.activo_id = ac.id
                JOIN items i ON ac.item_id = i.id
                JOIN personal p ON a.personal_id = p.id
            ";
            if ($activo_id) {
                $stmt = $pdo->prepare($sql . " WHERE a.activo_id = ? ORDER BY a.fecha_asignacion DESC");
                $stmt->execute([$activo_id]);
            } else {
                $stmt = $pdo->query($sql . " ORDER BY a.id DESC");
            }
            json_response(['assignments' => $stmt->fetchAll()]);
            break;

        case 'POST':
            $b = get_body();
            if (!isset($b['activo_id'], $b['personal_id'], $b['fecha_asignacion'])) {
                json_response(['error' => 'Datos incompletos'], 400);
            }

            $pdo->beginTransaction();
            try {
                // 0. VALIDACIÓN: Verificar si el equipo ya está asignado o está de baja
                $check = $pdo->prepare("SELECT id, estado FROM activos WHERE id = ?");
                $check->execute([$b['activo_id']]);
                $assetStatus = $check->fetch();

                if (!$assetStatus) {
                    json_response(['error' => 'El equipo no existe.'], 404);
                    return;
                }

                if ($assetStatus['estado'] === 'Baja') {
                    json_response(['error' => 'Este equipo se encuentra DE BAJA y no puede ser asignado.'], 400);
                    return;
                }

                $checkAsig = $pdo->prepare("SELECT id FROM asignaciones WHERE activo_id = ? AND estado = 'Activo' AND fecha_devolucion IS NULL");
                $checkAsig->execute([$b['activo_id']]);
                if ($checkAsig->fetch()) {
                    json_response(['error' => 'Este equipo ya se encuentra asignado a alguien.'], 400);
                    return;
                }

                // 1. Registrar la asignación
                $sql = "INSERT INTO asignaciones (activo_id, personal_id, fecha_asignacion, condicion_entrega, observaciones) VALUES (?,?,?,?,?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['activo_id'],
                    $b['personal_id'],
                    $b['fecha_asignacion'],
                    $b['condicion_entrega'] ?? 'Bueno',
                    (!empty($b['observaciones'])) ? $b['observaciones'] : null
                ]);

                // 2. Actualizar el personal_id en la tabla activos para referencia rápida
                $personal_id = (!empty($b['personal_id'])) ? $b['personal_id'] : null;
                $stmtUpd = $pdo->prepare("UPDATE activos SET personal_id = ? WHERE id = ?");
                $stmtUpd->execute([$personal_id, $b['activo_id']]);

                // Guardar el ID de la asignación antes de insertar el movimiento
                $asignacion_id = $pdo->lastInsertId();

                // 3. REGISTRAR MOVIMIENTO DE SALIDA (Para disminuir stock disponible)
                // Primero obtener el item_id del activo
                $stmtItem = $pdo->prepare("SELECT item_id FROM activos WHERE id = ?");
                $stmtItem->execute([$b['activo_id']]);
                $asset = $stmtItem->fetch();
                
                if (!$asset) {
                    throw new Exception("No se encontró el activo para registrar el movimiento.");
                }

                // Obtener nombre del personal para la observación
                $stmtPers = $pdo->prepare("SELECT nombre FROM personal WHERE id = ?");
                $stmtPers->execute([$personal_id]);
                $pers = $stmtPers->fetch();
                $p_nombre = $pers ? $pers['nombre'] : 'Personal ID ' . $personal_id;

                // Insertar el movimiento de SALIDA desde Almacén (ID 13)
                $ALMACEN_ID = 13;
                $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, personal_destinatario_id, observacion) VALUES (?, 'Salida', 1, ?, ?, ?)");
                $stmtMov->execute([
                    $asset['item_id'], 
                    $ALMACEN_ID,
                    $personal_id,
                    "Asignación de equipo a " . $p_nombre
                ]);

                $pdo->commit();
                json_response(['ok' => true, 'id' => $asignacion_id]);
            } catch (Exception $e) {
                $pdo->rollBack();
                json_response(['error' => 'Error al registrar: ' . $e->getMessage()], 400);
                return;
            }
            break;

        case 'PUT':
            // Usado para registrar DEVOLUCIONES
            $b = get_body();
            if (!isset($b['id'], $b['fecha_devolucion'])) {
                json_response(['error' => 'ID y fecha de devolución requeridos'], 400);
            }

            $pdo->beginTransaction();
            try {
                // 0. Obtener datos de la asignación antes de cerrar
                $stmtCheck = $pdo->prepare("SELECT activo_id, estado FROM asignaciones WHERE id = ?");
                $stmtCheck->execute([$b['id']]);
                $asig = $stmtCheck->fetch();

                if (!$asig || $asig['estado'] !== 'Activo') {
                    throw new Exception("La asignación no existe o ya ha sido devuelta.");
                }

                // 1. Actualizar la asignación
                $sql = "UPDATE asignaciones SET fecha_devolucion = ?, estado = 'Devuelto', condicion_devolucion = ?, observaciones = CONCAT(COALESCE(observaciones,''), '\nDevolución: ', ?) WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $b['fecha_devolucion'],
                    $b['condicion_devolucion'] ?? 'Bueno',
                    $b['observaciones'] ?? '',
                    $b['id']
                ]);

                // 2. Liberar el activo y registrar entrada de vuelta al stock
                $stmtAsset = $pdo->prepare("SELECT item_id, codigo_interno FROM activos WHERE id = ?");
                $stmtAsset->execute([$asig['activo_id']]);
                $asset = $stmtAsset->fetch();

                if ($asset) {
                    $isBaja = !empty($b['dar_de_baja']);
                    $movType = $isBaja ? 'Baja' : 'Entrada';
                    $movObs = $isBaja ? "BAJA POR DAÑO/OBSOLESCENCIA: " : "Devolución de equipo: ";
                    
                    // Registrar entrada o baja de vuelta al stock (Almacén ID 13)
                    $ALMACEN_ID = 13;
                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, ?, 1, ?, ?)");
                    $stmtMov->execute([$asset['item_id'], $movType, $ALMACEN_ID, $movObs . ($asset['codigo_interno'] ?? 'S/N')]);
                    
                    // Liberar personal del activo y actualizar estado si es baja
                    if ($isBaja) {
                        $pdo->prepare("UPDATE activos SET personal_id = NULL, estado = 'Baja' WHERE id = ?")->execute([$asig['activo_id']]);
                    } else {
                        $pdo->prepare("UPDATE activos SET personal_id = NULL WHERE id = ?")->execute([$asig['activo_id']]);
                    }
                }

                $pdo->commit();
                json_response(['ok' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                json_response(['error' => 'Error al devolver: ' . $e->getMessage()], 400);
                return;
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            $pdo->beginTransaction();
            try {
                // Si eliminamos la asignación actual, debemos limpiar el personal_id del activo
                $stmtGet = $pdo->prepare("SELECT activo_id, estado FROM asignaciones WHERE id = ?");
                $stmtGet->execute([$id]);
                $asig = $stmtGet->fetch();
                
                if ($asig && $asig['estado'] === 'Activo') {
                    $pdo->prepare("UPDATE activos SET personal_id = NULL WHERE id = ?")->execute([$asig['activo_id']]);
                }

                $pdo->prepare("DELETE FROM asignaciones WHERE id = ?")->execute([$id]);
                $pdo->commit();
                json_response(['ok' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
