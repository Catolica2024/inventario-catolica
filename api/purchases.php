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
                           p.telefono as proveedor_telefono, p.contacto as proveedor_contacto,
                           a.nombre as area_nombre
                    FROM ordenes_compra oc
                    JOIN proveedores p ON oc.proveedor_id = p.id
                    LEFT JOIN areas a ON oc.area_id = a.id
                    WHERE oc.id = ?
                ");
                $stmt->execute([$_GET['id']]);
                $oc = $stmt->fetch();
                if (!$oc) { json_response(['error' => 'No encontrada'], 404); break; }

                $items = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ? ORDER BY id");
                $items->execute([$_GET['id']]);
                $oc['items'] = $items->fetchAll();
                // Cuotas si aplica
                $cuotas = $pdo->prepare("SELECT * FROM ordenes_cuotas WHERE orden_id = ? ORDER BY numero_cuota");
                $cuotas->execute([$_GET['id']]);
                $oc['cuotas'] = $cuotas->fetchAll();
                json_response(['purchase' => $oc]);
                break;
            }
            // Listar todas — incluir info de cuotas
            $rows = $pdo->query("
                SELECT oc.*, p.razon_social as proveedor_nombre, a.nombre as area_nombre,
                       (SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = oc.id) as total_cuotas_reg,
                       (SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = oc.id AND pagado = 1) as cuotas_pagadas
                FROM ordenes_compra oc
                JOIN proveedores p ON oc.proveedor_id = p.id
                LEFT JOIN areas a ON oc.area_id = a.id
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
            $porc = floatval($b['igv_porcentaje'] ?? 18) / 100;
            $base = array_sum(array_map(fn($i) => floatval($i['total'] ?? 0), $items));
            $incluido = !empty($b['precios_con_igv']);

            if ($incluido) {
                $total = round($base, 2);
                $subtotal = round($total / (1 + $porc), 2);
                $igv = round($total - $subtotal, 2);
            } else {
                $subtotal = round($base, 2);
                $igv = round($subtotal * $porc, 2);
                $total = round($subtotal + $igv, 2);
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("
                INSERT INTO ordenes_compra
                  (creado_por, numero_oc, tipo, proveedor_id, fecha, area_id, moneda, condicion_pago, condicion_detalle, adelanto_porcentaje, adelanto_monto, saldo_monto, fecha_requerida, subtotal, igv, igv_porcentaje, precios_con_igv, total, monto, estado, observaciones)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $b['usuario_id'] ?? null,
                $numero_oc,
                $tipo,
                $b['proveedor_id'],
                $b['fecha'] ?? date('Y-m-d'),
                $b['area_id'] ?? null,
                $b['moneda'] ?? 'PEN',
                $b['condicion_pago'] ?? 'Al contado',
                $b['condicion_detalle'] ?? null,
                $b['adelanto_porcentaje'] ?? null,
                $b['adelanto_monto'] ?? null,
                $b['saldo_monto'] ?? null,
                $b['fecha_requerida'] ?? null,
                $subtotal,
                $igv,
                $b['igv_porcentaje'] ?? 18,
                $incluido ? 1 : 0,
                $total,
                $total,
                'Pendiente',
                $b['observaciones'] ?? null
            ]);
            $orden_id = $pdo->lastInsertId();

            // Insertar ítems
            if (!empty($items)) {
                $si = $pdo->prepare("INSERT INTO ordenes_compra_items (orden_id, item_id, descripcion, unidad, cantidad, precio_unitario, total) VALUES (?,?,?,?,?,?,?)");
                foreach ($items as $it) {
                    $si->execute([$orden_id, $it['item_id'] ?? null, $it['descripcion'], $it['unidad'] ?? 'Unidad', $it['cantidad'], $it['precio_unitario'], $it['total']]);
                }
            }

            // Calcular y guardar fecha_vencimiento para crédito
            $condPago = $b['condicion_pago'] ?? 'Al contado';
            $condDetalle = $b['condicion_detalle'] ?? null;
            $fechaVencimiento = null;
            if ($condPago === 'Credito' && $condDetalle) {
                $dias = intval($condDetalle); // "30 días" → 30
                if ($dias > 0) {
                    $fechaVencimiento = date('Y-m-d', strtotime('+' . $dias . ' days', strtotime($b['fecha'] ?? 'now')));
                }
            }
            if ($fechaVencimiento) {
                $pdo->prepare("UPDATE ordenes_compra SET fecha_vencimiento = ? WHERE id = ?")
                    ->execute([$fechaVencimiento, $orden_id]);
            }

            // Crear cuotas automáticamente si es pago en cuotas
            if ($condPago === 'Credito' && $condDetalle && stripos($condDetalle, 'cuotas') !== false) {
                $numCuotas = intval($condDetalle);
                if ($numCuotas > 1) {
                    $montoCuota = round($total / $numCuotas, 2);
                    $scuota = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento) VALUES (?,?,?,?,?)");
                    for ($c = 1; $c <= $numCuotas; $c++) {
                        // Vencimiento de cada cuota: cada 30 días a partir de hoy
                        $fVenc = date('Y-m-d', strtotime('+' . ($c * 30) . ' days', strtotime($b['fecha'] ?? 'now')));
                        $scuota->execute([$orden_id, $c, $numCuotas, $montoCuota, $fVenc]);
                    }
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
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET proveedor_id=?, fecha=?, area_id=?, monto=?, estado=?, observaciones=? WHERE id=?");
                $stmt->execute([$b['proveedor_id'], $b['fecha'], $b['area_id'] ?? null, $b['monto'], $b['estado'], $b['observaciones'] ?? null, $id]);
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
            } else if (($b['action'] ?? '') === 'pay_cuota') {
                // Pagar una cuota individual
                $cuota_id = $b['cuota_id'] ?? null;
                if (!$cuota_id) json_response(['error' => 'cuota_id requerido'], 400);
                $stmt = $pdo->prepare("UPDATE ordenes_cuotas SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE id = ? AND orden_id = ?");
                $stmt->execute([$b['voucher_url'] ?? null, $cuota_id, $id]);

                // Revisar si todas las cuotas están pagadas → marcar OC como pagada
                $totC = $pdo->prepare("SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = ?");
                $totC->execute([$id]);
                $pagC = $pdo->prepare("SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = ? AND pagado = 1");
                $pagC->execute([$id]);
                if ($totC->fetchColumn() == $pagC->fetchColumn()) {
                    $pdo->prepare("UPDATE ordenes_compra SET pagado = 1, fecha_pago = NOW() WHERE id = ?")->execute([$id]);
                }
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'pay_adelanto') {
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET adelanto_pagado = 1, adelanto_fecha = NOW(), adelanto_voucher = ? WHERE id = ?");
                $stmt->execute([$b['voucher_url'], $id]);
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'pay') {
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE id = ?");
                $stmt->execute([$b['voucher_url'], $id]);
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'receive') {
                $conformidad = $b['conformidad_url'] ?? null;
                $comprobante = $b['comprobante_url'] ?? null;
                
                $sets = [];
                $params = [];
                
                if ($conformidad) {
                    $sets[] = "conformidad_url = ?, fecha_conformidad = NOW()";
                    $params[] = $conformidad;
                }
                if ($comprobante) {
                    $sets[] = "comprobante_url = ?, fecha_recepcion = NOW()";
                    $params[] = $comprobante;
                }
                
                if (empty($sets)) json_response(['error' => 'No se proporcionó documento'], 400);
                
                $sql = "UPDATE ordenes_compra SET " . implode(", ", $sets) . " WHERE id = ?";
                $params[] = $id;
                $pdo->prepare($sql)->execute($params);
                
                // Verificar si ambos están para cambiar estado a 'Recibida'
                $check = $pdo->prepare("SELECT conformidad_url, comprobante_url, tipo, numero_oc, creado_por FROM ordenes_compra oc JOIN proveedores p ON oc.proveedor_id = p.id WHERE oc.id = ?");
                $check->execute([$id]);
                $curr = $check->fetch();
                
                if ($curr['conformidad_url'] && $curr['comprobante_url']) {
                    $pdo->prepare("UPDATE ordenes_compra SET estado = 'Recibida' WHERE id = ?")->execute([$id]);
                    
                    // --- INTEGRACIÓN CON INVENTARIO ---
                    // Verificar si ya se actualizó el stock
                    $checkStock = $pdo->prepare("SELECT stock_actualizado, numero_oc FROM ordenes_compra WHERE id = ?");
                    $checkStock->execute([$id]);
                    $ocData = $checkStock->fetch();

                    if (!$ocData['stock_actualizado']) {
                        // Obtener items de la OC que tienen item_id
                        $itemsStmt = $pdo->prepare("
                            SELECT oci.*, i.nombre as item_nombre, c.tipo as categoria_tipo 
                            FROM ordenes_compra_items oci
                            JOIN items i ON oci.item_id = i.id
                            LEFT JOIN categorias_inventario c ON i.categoria_inventario_id = c.id
                            WHERE oci.orden_id = ?
                        ");
                        $itemsStmt->execute([$id]);
                        $ocItems = $itemsStmt->fetchAll();

                        foreach ($ocItems as $item) {
                            if ($item['categoria_tipo'] === 'insumo') {
                                // Registrar movimiento de entrada automático
                                $mov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, observacion, fecha) VALUES (?, 'entrada', ?, ?, NOW())");
                                $mov->execute([
                                    $item['item_id'], 
                                    $item['cantidad'], 
                                    "Entrada automática por recepción de " . $ocData['numero_oc']
                                ]);
                            } else if ($item['categoria_tipo'] === 'activo') {
                                // Crear registros de activos pendientes (uno por cada unidad comprada)
                                $actStmt = $pdo->prepare("INSERT INTO activos (item_id, estado, numero_serie) VALUES (?, 'Pendiente de Registro', ?)");
                                for ($i = 0; $i < $item['cantidad']; $i++) {
                                    $actStmt->execute([$item['item_id'], "PENDIENTE-" . $ocData['numero_oc'] . "-" . ($i+1)]);
                                }
                            }
                        }
                        
                        // Marcar como actualizado
                        $pdo->prepare("UPDATE ordenes_compra SET stock_actualizado = 1 WHERE id = ?")->execute([$id]);
                    }
                    // ----------------------------------

                    // Notificar al creador
                    $msg = "La " . ($curr['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$curr['numero_oc']} ha sido marcada como RECIBIDA totalmente (Conformidad y Factura subidas).";
                    $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Recepción Completa', ?, 'success')")
                        ->execute([$curr['creado_por'], $msg]);
                }
                
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'reject') {
                $rol = $b['rol'] ?? $b['role'] ?? 'usuario';
                $motivo = $b['motivo'] ?? 'Sin motivo';
                $col = ($rol === 'gerente_general' ? 'rechazado_gerente' : ($rol === 'jefe_finanzas' ? 'rechazado_finanzas' : ''));
                $sql_col = $col ? ", {$col} = 1" : "";
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET estado = 'Rechazada' {$sql_col}, observaciones = CONCAT(IFNULL(observaciones,''), ' | Rechazo: ', ?) WHERE id = ?");
                $stmt->execute([$motivo, $id]);

                // Notificar al creador
                $quien = ($rol === 'gerente_general' ? 'el Gerente General' : ($rol === 'jefe_finanzas' ? 'el Jefe de Finanzas' : 'el Administrador'));
                $msg = "La " . ($ocInfo['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$ocInfo['numero_oc']} ha sido RECHAZADA por {$quien}. Motivo: {$motivo}";
                $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documento Rechazado', ?, 'error')")
                    ->execute([$ocInfo['creado_por'], $msg]);

                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'notify_payment') {
                $type = $b['payment_type']; // 'adelanto', 'saldo', 'cuota'
                $paymentId = $b['payment_id'] ?? null;
                
                $sql = "SELECT oc.*, p.razon_social, p.email as proveedor_email, p.contacto as proveedor_contacto 
                        FROM ordenes_compra oc 
                        JOIN proveedores p ON oc.proveedor_id = p.id 
                        WHERE oc.id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                $oc = $stmt->fetch();
                
                if (!$oc) json_response(['error' => 'No encontrada'], 404);
                if (empty($oc['proveedor_email'])) json_response(['error' => 'El proveedor no tiene correo registrado'], 400);
                
                $voucher_url = '';
                $concepto = '';
                $monto = 0;
                
                if ($type === 'adelanto') {
                    $voucher_url = $oc['adelanto_voucher'];
                    $concepto = "Adelanto del " . $oc['adelanto_porcentaje'] . "%";
                    $monto = $oc['adelanto_monto'];
                } else if ($type === 'saldo' || $type === 'contado') {
                    $voucher_url = $oc['voucher_url'];
                    $concepto = ($type === 'saldo' ? "Saldo Final" : "Pago Total");
                    $monto = ($type === 'saldo' ? $oc['saldo_monto'] : $oc['monto']);
                } else if ($type === 'cuota') {
                    $c_stmt = $pdo->prepare("SELECT * FROM ordenes_cuotas WHERE id = ?");
                    $c_stmt->execute([$paymentId]);
                    $c = $c_stmt->fetch();
                    $voucher_url = $c['voucher_url'];
                    $concepto = "Cuota N° " . $c['numero_cuota'];
                    $monto = $c['monto_cuota'];
                }
                
                if (empty($voucher_url)) json_response(['error' => 'No hay voucher registrado para este pago'], 400);
                
                require_once __DIR__ . '/../includes/mailer.php';
                try {
                $mailData = [
                    'to' => $oc['proveedor_email'],
                    'cc' => 'compras@colegiolacatolica.edu.pe',
                    'subject' => "Confirmación de Pago - OC/OS " . $oc['numero_oc'],
                    'provider' => $oc['razon_social'],
                    'contact' => $oc['proveedor_contacto'],
                    'oc_number' => $oc['numero_oc'],
                    'concept' => $concepto,
                    'amount' => $monto,
                    'moneda' => $oc['moneda'] ?? 'PEN',
                    'voucher_url' => $voucher_url
                ];
                
                    if (@Mailer::sendPaymentVoucherToSupplier($mailData)) {
                        json_response(['ok' => true]);
                    } else {
                        json_response(['error' => 'El servidor de correo rechazó el envío. Verifique la configuración de sendmail.'], 500);
                    }
                } catch (Throwable $mailEx) {
                    json_response(['error' => 'Error interno al procesar el correo: ' . $mailEx->getMessage()], 500);
                }
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
