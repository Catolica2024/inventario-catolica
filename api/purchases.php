<?php
// api/purchases.php — CRUD completo de órdenes de compra con ítems
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            // Obtener una OC específica con sus ítems
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare("
                    SELECT oc.*, p.razon_social as proveedor_nombre, p.ruc, p.direccion as proveedor_direccion,
                           p.telefono as proveedor_telefono, p.contacto as proveedor_contacto
                    FROM ordenes_compra oc
                    JOIN proveedores p ON oc.proveedor_id = p.id
                    WHERE oc.id = ?
                ");
                $stmt->execute([$_GET['id']]);
                $oc = $stmt->fetch();
                if (!$oc) { json_response(['error' => 'No encontrada'], 404); break; }

                $items = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ? ORDER BY id");
                $items->execute([$_GET['id']]);
                $oc['items'] = $items->fetchAll();
                json_response(['purchase' => $oc]);
                break;
            }
            // Listar todas
            $rows = $pdo->query("
                SELECT oc.*, p.razon_social as proveedor_nombre
                FROM ordenes_compra oc
                JOIN proveedores p ON oc.proveedor_id = p.id
                ORDER BY oc.id DESC
            ")->fetchAll();
            json_response(['purchases' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['proveedor_id'])) {
                json_response(['error' => 'Proveedor requerido'], 400);
            }

            $tipo = $b['tipo'] ?? 'compra';
            $prefix = ($tipo === 'servicio') ? 'OS' : 'OC';

            // Auto-generar número correlativo según tipo
            $stmtLast = $pdo->prepare("SELECT numero_oc FROM ordenes_compra WHERE tipo = ? ORDER BY id DESC LIMIT 1");
            $stmtLast->execute([$tipo]);
            $last = $stmtLast->fetchColumn();
            
            $num = 1;
            if ($last) { preg_match('/(\d+)$/', $last, $m); $num = intval($m[1] ?? 0) + 1; }
            $numero_oc = $prefix . '-' . date('Y') . '-' . str_pad($num, 3, '0', STR_PAD_LEFT);

            $items = $b['items'] ?? [];
            $subtotal = array_sum(array_map(fn($i) => floatval($i['total'] ?? 0), $items));
            $igv = round($subtotal * 0.18, 2);
            $total = round($subtotal + $igv, 2);

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("
                INSERT INTO ordenes_compra
                  (creado_por, numero_oc, tipo, proveedor_id, fecha, area_solicitante, moneda, condicion_pago, fecha_requerida, subtotal, igv, total, monto, estado, observaciones)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $b['usuario_id'] ?? null,
                $numero_oc,
                $tipo,
                $b['proveedor_id'],
                $b['fecha'] ?? date('Y-m-d'),
                $b['area_solicitante'] ?? null,
                $b['moneda'] ?? 'PEN',
                $b['condicion_pago'] ?? 'Al contado',
                $b['fecha_requerida'] ?? null,
                $subtotal,
                $igv,
                $total,
                $total,
                'Pendiente',
                $b['observaciones'] ?? null
            ]);
            $orden_id = $pdo->lastInsertId();

            // Insertar ítems
            if (!empty($items)) {
                $si = $pdo->prepare("INSERT INTO ordenes_compra_items (orden_id, descripcion, unidad, cantidad, precio_unitario, total) VALUES (?,?,?,?,?,?)");
                foreach ($items as $it) {
                    $si->execute([$orden_id, $it['descripcion'], $it['unidad'] ?? 'Unidad', $it['cantidad'], $it['precio_unitario'], $it['total']]);
                }
            }
            $pdo->commit();

            // Generar tokens de aprobación remota
            require_once __DIR__ . '/../includes/mailer.php';
            $token_gerente = bin2hex(random_bytes(32));
            $token_finanzas = bin2hex(random_bytes(32));
            $exp = date('Y-m-d H:i:s', strtotime('+48 hours'));

            $st = $pdo->prepare("INSERT INTO ordenes_compra_tokens (orden_id, token, rol, expiracion) VALUES (?,?,?,?)");
            $st->execute([$orden_id, $token_gerente, 'gerente_general', $exp]);
            $st->execute([$orden_id, $token_finanzas, 'jefe_finanzas', $exp]);

            // Enviar correos
            try {
                Mailer::sendNewOCNotification($orden_id, [
                    'gerente' => $token_gerente,
                    'finanzas' => $token_finanzas
                ]);
            } catch (Exception $e) {
                // No detenemos el flujo si falla el correo, pero lo registramos
                error_log("Error enviando correo OC $orden_id: " . $e->getMessage());
            }

            json_response(['ok' => true, 'id' => $orden_id, 'numero_oc' => $numero_oc]);
            break;

        case 'PUT':
            $b = get_body();
            $id = $b['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            // Si es una actualización completa (desde edición)
            if (isset($b['proveedor_id'])) {
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET proveedor_id=?, fecha=?, monto=?, estado=?, observaciones=? WHERE id=?");
                $stmt->execute([$b['proveedor_id'], $b['fecha'], $b['monto'], $b['estado'], $b['observaciones'] ?? null, $id]);
                json_response(['ok' => true]);
                break;
            }

            // Si es una acción de aprobación/rechazo
            $action = $b['action'] ?? null;

            // Obtener datos de la OC para notificaciones
            $stmtOC = $pdo->prepare("SELECT numero_oc, creado_por, tipo FROM ordenes_compra WHERE id = ?");
            $stmtOC->execute([$id]);
            $ocInfo = $stmtOC->fetch();

            if (($b['action'] ?? '') === 'approve') {
                $rol = $b['rol'] ?? $b['role'] ?? '';
                if ($rol === 'admin') {
                    $stmt = $pdo->prepare("UPDATE ordenes_compra SET aprobado_gerente = 1, aprobado_finanzas = 1 WHERE id = ?");
                    $stmt->execute([ $id ]);
                } else {
                    $stmt = $pdo->prepare("UPDATE ordenes_compra SET aprobado_gerente = IF(?, 1, aprobado_gerente), aprobado_finanzas = IF(?, 1, aprobado_finanzas) WHERE id = ?");
                    $stmt->execute([ $rol === 'gerente_general', $rol === 'jefe_finanzas', $id ]);
                }
                
                // Si ambos aprobaron, cambiar estado a 'Aprobada'
                $stmtCheck = $pdo->prepare("SELECT aprobado_gerente, aprobado_finanzas FROM ordenes_compra WHERE id = ?");
                $stmtCheck->execute([$id]);
                $oc = $stmtCheck->fetch();
                if ($oc['aprobado_gerente'] && $oc['aprobado_finanzas']) {
                    $pdo->prepare("UPDATE ordenes_compra SET estado = 'Aprobada' WHERE id = ?")->execute([$id]);
                    
                    // Notificar al creador
                    $msg = "La " . ($ocInfo['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$ocInfo['numero_oc']} ha sido APROBADA totalmente.";
                    $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documento Aprobado', ?, 'success')")
                        ->execute([$ocInfo['creado_por'], $msg]);
                } else {
                    // Notificar aprobación parcial
                    $quien = ($rol === 'gerente_general' ? 'el Gerente General' : 'el Jefe de Finanzas');
                    $msg = "{$quien} ha aprobado la " . ($ocInfo['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$ocInfo['numero_oc']}. Falta una firma.";
                    $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Aprobación Parcial', ?, 'info')")
                        ->execute([$ocInfo['creado_por'], $msg]);
                }
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'pay') {
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE id = ?");
                $stmt->execute([$b['voucher_url'], $id]);
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'reject') {
                $rol = $b['rol'] ?? $b['role'] ?? 'usuario';
                $motivo = $b['motivo'] ?? 'Sin motivo';
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET estado = 'Rechazada', observaciones = CONCAT(IFNULL(observaciones,''), ' | Rechazo: ', ?) WHERE id = ?");
                $stmt->execute([$motivo, $id]);

                // Notificar al creador
                $quien = ($rol === 'gerente_general' ? 'el Gerente General' : ($rol === 'jefe_finanzas' ? 'el Jefe de Finanzas' : 'el Administrador'));
                $msg = "La " . ($ocInfo['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$ocInfo['numero_oc']} ha sido RECHAZADA por {$quien}. Motivo: {$motivo}";
                $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documento Rechazado', ?, 'error')")
                    ->execute([$ocInfo['creado_por'], $msg]);

                json_response(['ok' => true]);
            } else {
                json_response(['error' => 'Acción no válida'], 400);
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $pdo->prepare("DELETE FROM ordenes_compra WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
