<?php
// api/purchases.php — CRUD completo de órdenes de compra con ítems
ob_start();
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            // Obtener todos los ítems generados en OC/OS para exportar a Excel
            if (isset($_GET['all_items'])) {
                $rows = $pdo->query("
                    SELECT oci.id as item_id_reg, oci.categoria_nombre, oci.prefijo, oci.descripcion, oci.unidad, oci.cantidad, oci.precio_unitario, oci.total as total_item, oci.factor_conversion,
                           oc.numero_oc, oc.tipo, oc.fecha, oc.estado, oc.moneda, oc.condicion_pago,
                           p.razon_social as proveedor_nombre, a.nombre as area_nombre,
                           oc.aprobado_gerente, oc.aprobado_finanzas, oc.pagado
                    FROM ordenes_compra_items oci
                    JOIN ordenes_compra oc ON oci.orden_id = oc.id
                    JOIN proveedores p ON oc.proveedor_id = p.id
                    LEFT JOIN areas a ON oc.area_id = a.id
                    ORDER BY oc.id DESC, oci.id ASC
                ")->fetchAll();
                json_response(['items' => $rows]);
                break;
            }

            // Obtener una OC específica con sus ítems
            if (isset($_GET['id'])) {
                $stmt = $pdo->prepare("
                    SELECT oc.*, p.razon_social as proveedor_nombre, p.ruc, p.direccion as proveedor_direccion,
                           p.telefono as proveedor_telefono, p.contacto as proveedor_contacto,
                           a.nombre as area_nombre, u.nombre as creador_nombre
                    FROM ordenes_compra oc
                    LEFT JOIN proveedores p ON oc.proveedor_id = p.id
                    LEFT JOIN areas a ON oc.area_id = a.id
                    LEFT JOIN usuarios u ON oc.creado_por = u.id
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

                // Movilidad si aplica
                $mob = $pdo->prepare("SELECT m.*, p.razon_social as proveedor_nombre, p.banco, p.numero_cuenta, p.cci 
                                     FROM ordenes_movilidad m 
                                     LEFT JOIN proveedores p ON m.proveedor_id = p.id 
                                     WHERE m.orden_id = ? 
                                     LIMIT 1");
                $mob->execute([$_GET['id']]);
                $oc['mobility'] = $mob->fetch();

                json_response(['purchase' => $oc]);
                break;
            }
            // Listar todas — incluir info de cuotas
            $where = "1=1";
            if (isset($_GET['approved_only'])) {
                $where = "oc.estado IN ('Aprobada', 'Recibida', 'Completada')";
            }
            if (isset($_GET['requisitions_only'])) {
                $where .= " AND oc.estado LIKE 'Req_%'";
            } else if (!isset($_GET['include_reqs'])) {
                $where .= " AND oc.estado NOT LIKE 'Req_%'";
            }

            $rows = $pdo->query("
                SELECT oc.*, p.razon_social as proveedor_nombre,
                       COALESCE(a.nombre, a_pers.nombre) as area_nombre,
                       u.nombre as creador_nombre,
                       (SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = oc.id) as total_cuotas_reg,
                       (SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = oc.id AND pagado = 1) as cuotas_pagadas,
                       (SELECT COUNT(*) FROM ordenes_cuotas WHERE orden_id = oc.id AND comprobante_url IS NOT NULL AND comprobante_url != '') as cuotas_con_factura,
                       (SELECT pagado FROM ordenes_movilidad WHERE orden_id = oc.id LIMIT 1) as mobility_pagado,
                       (SELECT voucher_url FROM ordenes_movilidad WHERE orden_id = oc.id LIMIT 1) as mobility_voucher,
                       (SELECT p2.razon_social FROM ordenes_movilidad m2 JOIN proveedores p2 ON m2.proveedor_id = p2.id WHERE m2.orden_id = oc.id LIMIT 1) as mobility_proveedor_nombre,
                       (SELECT fecha_vencimiento FROM ordenes_cuotas WHERE orden_id = oc.id AND pagado = 0 ORDER BY numero_cuota ASC LIMIT 1) as proxima_cuota_vencimiento,
                       (SELECT numero_cuota FROM ordenes_cuotas WHERE orden_id = oc.id AND pagado = 0 ORDER BY numero_cuota ASC LIMIT 1) as proxima_cuota_numero
                FROM ordenes_compra oc
                LEFT JOIN proveedores p ON oc.proveedor_id = p.id
                LEFT JOIN areas a ON oc.area_id = a.id
                LEFT JOIN usuarios u ON oc.creado_por = u.id
                LEFT JOIN personal pers ON u.personal_id = pers.id
                LEFT JOIN areas a_pers ON pers.area_id = a_pers.id
                WHERE $where
                ORDER BY oc.id DESC
            ")->fetchAll();

            json_response(['purchases' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            $estado = $b['estado'] ?? 'Pendiente';
            
            // Si el proveedor está vacío o se especifica estado de req, tratamos como requisición
            $es_req = empty($b['proveedor_id']) || in_array($estado, ['Req_Pendiente_Area', 'Req_Pendiente_Compras']);
            
            if ($es_req) {
                // Simplificación por Roles: Si el rol es 'req_pedagogia' requiere firma del área (Pedagogía). Si no, va directo.
                $usuario_id = $b['usuario_id'] ?? null;
                $rol_nombre = '';
                if ($usuario_id) {
                    $stmtRol = $pdo->prepare("SELECT r.nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?");
                    $stmtRol->execute([$usuario_id]);
                    $rol_nombre = $stmtRol->fetchColumn();
                }
                $estado = ($rol_nombre === 'req_pedagogia') ? 'Req_Pendiente_Area' : 'Req_Pendiente_Compras';
            } else {
                if (empty($b['proveedor_id'])) {
                    json_response(['error' => 'Proveedor requerido para órdenes de compra/servicio'], 400);
                }
            }

            $tipo = $b['tipo'] ?? 'compra';
            $prefix = $es_req ? 'RQ' : (($tipo === 'servicio') ? 'OS' : 'OC');

            // Auto-generar número correlativo según prefijo/tipo
            if ($prefix === 'RQ') {
                $stmtLast = $pdo->prepare("SELECT numero_oc FROM ordenes_compra WHERE numero_oc LIKE 'RQ-%' ORDER BY id DESC LIMIT 1");
                $stmtLast->execute([]);
            } else {
                $stmtLast = $pdo->prepare("SELECT numero_oc FROM ordenes_compra WHERE tipo = ? AND numero_oc NOT LIKE 'RQ-%' ORDER BY id DESC LIMIT 1");
                $stmtLast->execute([$tipo]);
            }
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
                  (creado_por, numero_oc, tipo, proveedor_id, activo_id, fecha, area_id, moneda, condicion_pago, condicion_detalle, adelanto_porcentaje, adelanto_monto, saldo_monto, fecha_requerida, subtotal, igv, igv_porcentaje, precios_con_igv, total, monto, estado, observaciones, incluye_movilidad, monto_movilidad, dentro_presupuesto, es_alquiler, dia_pago, fecha_pago_adelanto, fecha_pago_saldo_proyectado, fecha_envio_requisicion)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $b['usuario_id'] ?? null,
                $numero_oc,
                $tipo,
                !empty($b['proveedor_id']) ? $b['proveedor_id'] : null,
                $b['activo_id'] ?? null,
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
                $estado,
                $b['observaciones'] ?? null,
                $b['incluye_movilidad'] ?? 1,
                $b['monto_movilidad'] ?? 0,
                isset($b['dentro_presupuesto']) ? (int)$b['dentro_presupuesto'] : 1,
                ($b['condicion_pago'] ?? '') === 'Alquiler' ? 1 : 0,
                isset($b['dia_pago']) ? (int)$b['dia_pago'] : null,
                $b['fecha_pago_adelanto'] ?? null,
                $b['fecha_pago_saldo_proyectado'] ?? null,
                $es_req ? date('Y-m-d H:i:s') : null
            ]);
            $orden_id = $pdo->lastInsertId();

            // LÓGICA EXPERTA: Si es un Servicio (OS), registrar en Mantenimiento y cambiar estado del activo
            if ($tipo === 'servicio' && !empty($b['activo_id'])) {
                $activo_id = $b['activo_id'];
                
                // 1. Obtener datos del activo para el registro de mantenimiento
                $stmtAct = $pdo->prepare("SELECT item_id FROM activos WHERE id = ?");
                $stmtAct->execute([$activo_id]);
                $act = $stmtAct->fetch();
                
                if ($act) {
                    // 2. Crear registro de mantenimiento
                    $sm = $pdo->prepare("INSERT INTO mantenimientos (activo_id, item_id, proveedor_id, tipo, estado, fecha_inicio, costo, descripcion_problema, orden_compra_id) VALUES (?,?,?,?,?,?,?,?,?)");
                    $sm->execute([
                        $activo_id,
                        $act['item_id'],
                        $b['proveedor_id'],
                        'Correctivo',
                        'Iniciado',
                        date('Y-m-d'),
                        $total,
                        'Servicio solicitado vía OS #' . $numero_oc . '. ' . ($b['observaciones'] ?? ''),
                        $orden_id
                    ]);

                    // 3. Cambiar estado del activo a 'Mantenimiento'
                    $pdo->prepare("UPDATE activos SET estado = 'Mantenimiento' WHERE id = ?")->execute([$activo_id]);
                }
            }

            // Insertar ítems
            if (!empty($items)) {
                $si = $pdo->prepare("INSERT INTO ordenes_compra_items (orden_id, item_id, categoria_nombre, prefijo, descripcion, unidad, cantidad, precio_unitario, total, factor_conversion) VALUES (?,?,?,?,?,?,?,?,?,?)");
                foreach ($items as $it) {
                    $si->execute([
                        $orden_id,
                        $it['item_id'] ?? null,
                        $it['categoria_nombre'] ?? null,
                        $it['prefijo'] ?? null,
                        $it['descripcion'],
                        $it['unidad'] ?? 'Unidad',
                        $it['cantidad'],
                        $it['precio_unitario'],
                        $it['total'],
                        $it['factor_conversion'] ?? 1.00
                    ]);
                }
            }

            // Insertar movilidad si es por separado
            if (isset($b['mobility']) && !empty($b['mobility'])) {
                $mob = $b['mobility'];
                $sm = $pdo->prepare("INSERT INTO ordenes_movilidad (orden_id, monto, descripcion, fecha, proveedor_id) VALUES (?,?,?,?,?)");
                $sm->execute([$orden_id, $mob['monto'], $mob['desc'] ?? null, $mob['fecha'] ?? date('Y-m-d'), $mob['proveedor_id'] ?? null]);
            }

            // Calcular y guardar fecha_vencimiento para crédito
            $condPago = $b['condicion_pago'] ?? 'Al contado';
            $condDetalle = $b['condicion_detalle'] ?? null;
            $fechaVencimiento = null;
            if ($condPago === 'Credito' && isset($b['fecha_vencimiento_credito']) && $b['fecha_vencimiento_credito']) {
                // Fecha límite directamente desde el front-end
                $fechaVencimiento = $b['fecha_vencimiento_credito'];
            } elseif ($condPago === 'Credito' && $condDetalle && stripos($condDetalle, 'cuotas') === false) {
                // Fallback: calcular desde días
                $dias = intval($condDetalle);
                if ($dias > 0) {
                    $fechaVencimiento = date('Y-m-d', strtotime('+' . $dias . ' days', strtotime($b['fecha'] ?? 'now')));
                }
            }
            if ($fechaVencimiento) {
                $pdo->prepare("UPDATE ordenes_compra SET fecha_vencimiento = ? WHERE id = ?")
                    ->execute([$fechaVencimiento, $orden_id]);
            }

            // Crear cuotas automáticamente si es pago en cuotas (Crédito N cuotas)
            if ($condPago === 'Credito' && $condDetalle && stripos($condDetalle, 'cuotas') !== false) {
                $numCuotas = intval($condDetalle);
                if ($numCuotas > 1) {
                    $montoCuota = round($total / $numCuotas, 2);
                    $scuota = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento, descripcion) VALUES (?,?,?,?,?,?)");
                    
                    // Usar dia del mes y fecha de inicio si se proporcionaron
                    $diaMesCuotas = isset($b['cuotas_dia_mes']) && $b['cuotas_dia_mes'] > 0 ? (int)$b['cuotas_dia_mes'] : null;
                    $fechaInicioCuotas = !empty($b['cuotas_fecha_inicio']) ? $b['cuotas_fecha_inicio'] : null;
                    
                    if ($fechaInicioCuotas) {
                        $dt = new DateTime($fechaInicioCuotas);
                        $meses_es = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                        for ($c = 1; $c <= $numCuotas; $c++) {
                            // Ajustar al día del mes de pago si se especificó
                            if ($diaMesCuotas && $c > 1) {
                                $maxDia = (int)(new DateTime($dt->format('Y-m-01')))->format('t');
                                $dt->setDate((int)$dt->format('Y'), (int)$dt->format('n'), min($diaMesCuotas, $maxDia));
                            }
                            $fVenc = $dt->format('Y-m-d');
                            $label = 'Cuota ' . $c . ' de ' . $numCuotas . ' - ' . $meses_es[(int)$dt->format('n')] . ' ' . $dt->format('Y');
                            $scuota->execute([$orden_id, $c, $numCuotas, $montoCuota, $fVenc, $label]);
                            // Avanzar al siguiente mes
                            $dt->modify('first day of next month');
                            if ($diaMesCuotas) {
                                $maxDia = (int)$dt->format('t');
                                $dt->setDate((int)$dt->format('Y'), (int)$dt->format('n'), min($diaMesCuotas, $maxDia));
                            }
                        }
                    } else {
                        // Sin fecha de inicio: cuotas cada 30 días desde hoy
                        $scuota2 = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento) VALUES (?,?,?,?,?)");
                        for ($c = 1; $c <= $numCuotas; $c++) {
                            $fVenc = date('Y-m-d', strtotime('+' . ($c * 30) . ' days', strtotime($b['fecha'] ?? 'now')));
                            $scuota2->execute([$orden_id, $c, $numCuotas, $montoCuota, $fVenc]);
                        }
                    }
                }
            }

            // ── Generar cuotas de ALQUILER mensual ──
            if ($condPago === 'Alquiler') {
                $diaPago       = isset($b['dia_pago']) ? (int)$b['dia_pago'] : 1;
                $mesesTotal    = isset($b['meses_alquiler']) ? max(1, (int)$b['meses_alquiler']) : 24;
                $montoCuota    = round($total / $mesesTotal, 2);
                $fechaInicio   = $b['fecha_primera_cuota'] ?? null;

                if (!$fechaInicio) {
                    // Por defecto: próximo día_pago después de hoy
                    $hoy = new DateTime();
                    $anio = (int)$hoy->format('Y');
                    $mes  = (int)$hoy->format('n');
                    if ((int)$hoy->format('j') >= $diaPago) { $mes++; }
                    if ($mes > 12) { $mes = 1; $anio++; }
                    $diaCap = min($diaPago, (int)(new DateTime("$anio-$mes-01"))->format('t'));
                    $fechaInicio = sprintf('%04d-%02d-%02d', $anio, $mes, $diaCap);
                }

                $scuota = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento, descripcion) VALUES (?,?,?,?,?,?)");
                $dt = new DateTime($fechaInicio);
                for ($c = 1; $c <= $mesesTotal; $c++) {
                    $fVenc = $dt->format('Y-m-d');
                    $label = 'Alquiler - ' . strftime('%B %Y', $dt->getTimestamp());
                    // strftime no está disponible en todos los sistemas, usar alternativa
                    $meses_es = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                    $label = 'Alquiler - ' . $meses_es[(int)$dt->format('n')] . ' ' . $dt->format('Y');
                    $scuota->execute([$orden_id, $c, $mesesTotal, $montoCuota, $fVenc, $label]);
                    // Avanzar al siguiente mes manteniendo el día de pago
                    $dt->modify('first day of next month');
                    $diaCap = min($diaPago, (int)$dt->format('t'));
                    $dt->setDate((int)$dt->format('Y'), (int)$dt->format('n'), $diaCap);
                }
            }

            // Si es una requisición, guardar y salir inmediatamente (sin tokens ni correos a gerencia)
            if ($es_req) {
                $pdo->commit();

                if ($estado === 'Req_Pendiente_Area') {
                    try {
                        require_once __DIR__ . '/../includes/mailer.php';
                        Mailer::sendRequisitionNotificationToDirector($orden_id);
                    } catch (Exception $ex) {
                        error_log("No se pudo enviar notificación de requisición al director: " . $ex->getMessage());
                    }
                }

                json_response(['ok' => true, 'id' => $orden_id, 'numero_oc' => $numero_oc]);
                break;
            }

            // Cargar Mailer antes de los tokens para acceder a los emails configurados
            require_once __DIR__ . '/../includes/mailer.php';

            // Generar tokens de aprobación remota (se guarda el email destinatario para tracking)
            $token_gerente  = bin2hex(random_bytes(32));
            $token_finanzas = bin2hex(random_bytes(32));
            $exp = date('Y-m-d H:i:s', strtotime('+168 hours')); // 7 días para aprobar/rechazar

            $email_gerente  = Mailer::getEmail('gerente');
            $email_finanzas = Mailer::getEmail('finanzas');

            $st = $pdo->prepare("INSERT INTO ordenes_compra_tokens (orden_id, token, rol, expiracion, email_destinatario) VALUES (?,?,?,?,?)");
            $st->execute([$orden_id, $token_gerente,  'gerente_general', $exp, $email_gerente]);
            $st->execute([$orden_id, $token_finanzas, 'jefe_finanzas',   $exp, $email_finanzas]);

            $pdo->commit();

            // Enviar correos
            try {
                Mailer::sendNewOCNotification($orden_id, [
                    'gerente'  => $token_gerente,
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

            // ── Actualizar estado de requisición (aprobación/rechazo simple) ──
            if (($b['action'] ?? '') === 'update_status') {
                $estado = $b['estado'] ?? null;
                if (!$estado) json_response(['error' => 'Estado requerido'], 400);

                // Obtener estado anterior
                $stmtOC = $pdo->prepare("SELECT estado FROM ordenes_compra WHERE id = ?");
                $stmtOC->execute([$id]);
                $estado_anterior = $stmtOC->fetchColumn();
                if (!$estado_anterior) json_response(['error' => 'Orden no encontrada'], 404);

                $pdo->beginTransaction();
                
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET estado = ? WHERE id = ?");
                $stmt->execute([$estado, $id]);

                if ($estado_anterior === 'Req_Pendiente_Area' && $estado === 'Req_Pendiente_Compras') {
                    $pdo->prepare("UPDATE ordenes_compra SET fecha_aprobacion_director = NOW() WHERE id = ?")->execute([$id]);
                }

                if ($estado === 'Req_Rechazada' && isset($b['motivo_rechazo'])) {
                    $pdo->prepare("UPDATE ordenes_compra SET motivo_rechazo = ?, rechazo_por = ? WHERE id = ?")
                        ->execute([$b['motivo_rechazo'], $b['rechazo_por'] ?? 'Director', $id]);
                }

                $pdo->commit();
                json_response(['ok' => true]);
                break;
            }

            // ── Guardar links de Google Drive (solo URLs, sin datos extra) ──
            if (($b['action'] ?? '') === 'save_drive_links') {
                $fields = [];
                $vals   = [];
                if (isset($b['pdf_oc_url']))  { $fields[] = 'pdf_oc_url = ?';  $vals[] = $b['pdf_oc_url'];  }
                if (isset($b['pdf_mov_url'])) { $fields[] = 'pdf_mov_url = ?'; $vals[] = $b['pdf_mov_url']; }
                if (empty($fields)) json_response(['error' => 'Sin campos para actualizar'], 400);
                $vals[] = $id;
                $pdo->prepare("UPDATE ordenes_compra SET " . implode(', ', $fields) . " WHERE id = ?")
                    ->execute($vals);
                json_response(['ok' => true]);
                break;
            }

            // ── Configurar / regenerar calendario de alquiler (post-aprobación) ──
            if (($b['action'] ?? '') === 'setup_rental_schedule') {
                $diaPago     = max(1, min(31, (int)($b['dia_pago'] ?? 1)));
                $mesesTotal  = max(1, (int)($b['meses_alquiler'] ?? 24));
                $fechaInicio = $b['fecha_primera_cuota'] ?? null;

                // Obtener monto mensual de la OS
                $ocR = $pdo->prepare("SELECT total FROM ordenes_compra WHERE id = ?");
                $ocR->execute([$id]);
                $ocRow = $ocR->fetch();
                if (!$ocRow) json_response(['error' => 'OS no encontrada'], 404);

                if (!$fechaInicio) {
                    $hoy = new DateTime();
                    $anio = (int)$hoy->format('Y');
                    $mes  = (int)$hoy->format('n');
                    if ((int)$hoy->format('j') >= $diaPago) { $mes++; }
                    if ($mes > 12) { $mes = 1; $anio++; }
                    $diaCap = min($diaPago, (int)(new DateTime("$anio-$mes-01"))->format('t'));
                    $fechaInicio = sprintf('%04d-%02d-%02d', $anio, $mes, $diaCap);
                }

                // Borrar solo cuotas NO pagadas y regenerar
                $pdo->prepare("DELETE FROM ordenes_cuotas WHERE orden_id = ? AND pagado = 0")->execute([$id]);

                // Renumerar desde la última cuota pagada
                $lastPaid = $pdo->prepare("SELECT MAX(numero_cuota) FROM ordenes_cuotas WHERE orden_id = ? AND pagado = 1");
                $lastPaid->execute([$id]);
                $startNum = (int)($lastPaid->fetchColumn() ?? 0) + 1;
                $totalNuevo = ($startNum - 1) + $mesesTotal;
                $montoCuota = round(floatval($ocRow['total']) / $totalNuevo, 2);

                // Actualizar dia_pago en la OC
                $pdo->prepare("UPDATE ordenes_compra SET dia_pago = ? WHERE id = ?")->execute([$diaPago, $id]);

                $scuota = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento, descripcion) VALUES (?,?,?,?,?,?)");
                $meses_es = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                $dt = new DateTime($fechaInicio);
                for ($c = $startNum; $c <= $totalNuevo; $c++) {
                    $fVenc = $dt->format('Y-m-d');
                    $label = 'Alquiler - ' . $meses_es[(int)$dt->format('n')] . ' ' . $dt->format('Y');
                    $scuota->execute([$id, $c, $totalNuevo, $montoCuota, $fVenc, $label]);
                    $dt->modify('first day of next month');
                    $diaCap = min($diaPago, (int)$dt->format('t'));
                    $dt->setDate((int)$dt->format('Y'), (int)$dt->format('n'), $diaCap);
                }

                json_response(['ok' => true, 'cuotas_generadas' => $mesesTotal]);
                break;
            }

            // Si es una actualización completa (desde edición o procesamiento de requisición)
            if (isset($b['action']) && $b['action'] === 'full_update' || isset($b['proveedor_id'])) {
                // Obtener datos actuales de la OC
                $stmtOC = $pdo->prepare("SELECT numero_oc, creado_por, tipo, estado FROM ordenes_compra WHERE id = ?");
                $stmtOC->execute([$id]);
                $currOC = $stmtOC->fetch();
                if (!$currOC) json_response(['error' => 'Orden no encontrada'], 404);

                $estado_anterior = $currOC['estado'];
                $estado_nuevo = $b['estado'] ?? $estado_anterior;

                // Si es una requisición que pasa a Pendiente (se convierte a OC/OS formal)
                $numero_oc = $currOC['numero_oc'];
                $tipo = $b['tipo'] ?? $currOC['tipo'] ?? 'compra';
                
                if (strpos($numero_oc, 'RQ-') === 0 && $estado_nuevo === 'Pendiente') {
                    $prefix = ($tipo === 'servicio') ? 'OS' : 'OC';
                    $stmtLast = $pdo->prepare("SELECT numero_oc FROM ordenes_compra WHERE tipo = ? AND numero_oc NOT LIKE 'RQ-%' ORDER BY id DESC LIMIT 1");
                    $stmtLast->execute([$tipo]);
                    $last = $stmtLast->fetchColumn();
                    $num = 1;
                    if ($last) { preg_match('/(\d+)$/', $last, $m); $num = intval($m[1] ?? 0) + 1; }
                    $numero_oc = $prefix . '-' . date('Y') . '-' . str_pad($num, 3, '0', STR_PAD_LEFT);
                }

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
                    UPDATE ordenes_compra SET 
                        numero_oc = ?,
                        tipo = ?,
                        proveedor_id = ?,
                        activo_id = ?,
                        fecha = ?,
                        area_id = ?,
                        moneda = ?,
                        condicion_pago = ?,
                        condicion_detalle = ?,
                        adelanto_porcentaje = ?,
                        adelanto_monto = ?,
                        saldo_monto = ?,
                        fecha_requerida = ?,
                        subtotal = ?,
                        igv = ?,
                        igv_porcentaje = ?,
                        precios_con_igv = ?,
                        total = ?,
                        monto = ?,
                        estado = ?,
                        observaciones = ?,
                        incluye_movilidad = ?,
                        monto_movilidad = ?,
                        dentro_presupuesto = ?,
                        es_alquiler = ?,
                        dia_pago = ?,
                        fecha_pago_adelanto = ?,
                        fecha_pago_saldo_proyectado = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $numero_oc,
                    $tipo,
                    !empty($b['proveedor_id']) ? $b['proveedor_id'] : null,
                    $b['activo_id'] ?? null,
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
                    $estado_nuevo,
                    $b['observaciones'] ?? null,
                    $b['incluye_movilidad'] ?? 1,
                    $b['monto_movilidad'] ?? 0,
                    isset($b['dentro_presupuesto']) ? (int)$b['dentro_presupuesto'] : 1,
                    ($b['condicion_pago'] ?? '') === 'Alquiler' ? 1 : 0,
                    isset($b['dia_pago']) ? (int)$b['dia_pago'] : null,
                    $b['fecha_pago_adelanto'] ?? null,
                    $b['fecha_pago_saldo_proyectado'] ?? null,
                    $id
                ]);

                if ($estado_anterior === 'Req_Pendiente_Area' && $estado_nuevo === 'Req_Pendiente_Compras') {
                    $pdo->prepare("UPDATE ordenes_compra SET fecha_aprobacion_director = NOW() WHERE id = ?")->execute([$id]);
                }

                // Actualizar ítems
                $pdo->prepare("DELETE FROM ordenes_compra_items WHERE orden_id = ?")->execute([$id]);
                if (!empty($items)) {
                    $si = $pdo->prepare("INSERT INTO ordenes_compra_items (orden_id, item_id, categoria_nombre, prefijo, descripcion, unidad, cantidad, precio_unitario, total, factor_conversion) VALUES (?,?,?,?,?,?,?,?,?,?)");
                    foreach ($items as $it) {
                        $si->execute([
                            $id,
                            $it['item_id'] ?? null,
                            $it['categoria_nombre'] ?? null,
                            $it['prefijo'] ?? null,
                            $it['descripcion'],
                            $it['unidad'] ?? 'Unidad',
                            $it['cantidad'],
                            $it['precio_unitario'],
                            $it['total'],
                            $it['factor_conversion'] ?? 1.00
                        ]);
                    }
                }

                // Si la orden de servicio está vinculada a un activo y es servicio
                if ($tipo === 'servicio' && !empty($b['activo_id']) && $estado_nuevo === 'Pendiente') {
                    // Verificar si ya tiene mantenimiento para esta orden
                    $stmtM = $pdo->prepare("SELECT id FROM mantenimientos WHERE orden_compra_id = ?");
                    $stmtM->execute([$id]);
                    if (!$stmtM->fetchColumn()) {
                        $stmtAct = $pdo->prepare("SELECT item_id FROM activos WHERE id = ?");
                        $stmtAct->execute([$b['activo_id']]);
                        $act = $stmtAct->fetch();
                        if ($act) {
                            $sm = $pdo->prepare("INSERT INTO mantenimientos (activo_id, item_id, proveedor_id, tipo, estado, fecha_inicio, costo, descripcion_problema, orden_compra_id) VALUES (?,?,?,?,?,?,?,?,?)");
                            $sm->execute([
                                $b['activo_id'],
                                $act['item_id'],
                                $b['proveedor_id'],
                                'Correctivo',
                                'Iniciado',
                                date('Y-m-d'),
                                $total,
                                'Servicio solicitado vía OS #' . $numero_oc . '. ' . ($b['observaciones'] ?? ''),
                                $id
                            ]);
                            $pdo->prepare("UPDATE activos SET estado = 'Mantenimiento' WHERE id = ?")->execute([$b['activo_id']]);
                        }
                    }
                }

                // Generar cuotas si el estado es Pendiente y se convierte de requisición
                if ($estado_nuevo === 'Pendiente' && strpos($currOC['numero_oc'], 'RQ-') === 0) {
                    $condPago = $b['condicion_pago'] ?? 'Al contado';
                    // Recrear cuotas
                    $pdo->prepare("DELETE FROM ordenes_cuotas WHERE orden_id = ?")->execute([$id]);
                    
                    if ($condPago === 'Credito') {
                        $cTipo = $b['credito_tipo'] ?? 'Dias';
                        if ($cTipo === 'Cuotas') {
                            $numCuotas = max(2, (int)($b['condicion_val'] ?? 2));
                            $montoCuota = round($total / $numCuotas, 2);
                            $diaMesCuotas = isset($b['cuotas_dia_mes']) ? (int)$b['cuotas_dia_mes'] : null;
                            $fechaInicioCuotas = $b['cuotas_fecha_inicio'] ?? null;
                            
                            if ($fechaInicioCuotas) {
                                $scuota = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento, descripcion) VALUES (?,?,?,?,?,?)");
                                $dt = new DateTime($fechaInicioCuotas);
                                $meses_es = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                                for ($c = 1; $c <= $numCuotas; $c++) {
                                    if ($c > 1 && $diaMesCuotas) {
                                        $maxDia = (int)(new DateTime($dt->format('Y-m-01')))->format('t');
                                        $dt->setDate((int)$dt->format('Y'), (int)$dt->format('n'), min($diaMesCuotas, $maxDia));
                                    }
                                    $fVenc = $dt->format('Y-m-d');
                                    $label = 'Cuota ' . $c . ' de ' . $numCuotas . ' - ' . $meses_es[(int)$dt->format('n')] . ' ' . $dt->format('Y');
                                    $scuota->execute([$id, $c, $numCuotas, $montoCuota, $fVenc, $label]);
                                    $dt->modify('first day of next month');
                                }
                            } else {
                                $scuota2 = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento) VALUES (?,?,?,?,?)");
                                for ($c = 1; $c <= $numCuotas; $c++) {
                                    $fVenc = date('Y-m-d', strtotime('+' . ($c * 30) . ' days', strtotime($b['fecha'] ?? 'now')));
                                    $scuota2->execute([$id, $c, $numCuotas, $montoCuota, $fVenc]);
                                }
                            }
                        }
                    } else if ($condPago === 'Alquiler') {
                        $diaPago = isset($b['dia_pago']) ? (int)$b['dia_pago'] : 1;
                        $mesesTotal = isset($b['meses_alquiler']) ? max(1, (int)$b['meses_alquiler']) : 24;
                        $montoCuota = round($total / $mesesTotal, 2);
                        $fechaInicio = $b['fecha_primera_cuota'] ?? null;
                        
                        if (!$fechaInicio) {
                            $hoy = new DateTime();
                            $anio = (int)$hoy->format('Y');
                            $mes  = (int)$hoy->format('n');
                            if ((int)$hoy->format('j') >= $diaPago) { $mes++; }
                            if ($mes > 12) { $mes = 1; $anio++; }
                            $diaCap = min($diaPago, (int)(new DateTime("$anio-$mes-01"))->format('t'));
                            $fechaInicio = sprintf('%04d-%02d-%02d', $anio, $mes, $diaCap);
                        }
                        
                        $scuota = $pdo->prepare("INSERT INTO ordenes_cuotas (orden_id, numero_cuota, total_cuotas, monto_cuota, fecha_vencimiento, descripcion) VALUES (?,?,?,?,?,?)");
                        $dt = new DateTime($fechaInicio);
                        $meses_es = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                        for ($c = 1; $c <= $mesesTotal; $c++) {
                            $fVenc = $dt->format('Y-m-d');
                            $label = 'Alquiler - ' . $meses_es[(int)$dt->format('n')] . ' ' . $dt->format('Y');
                            $scuota->execute([$id, $c, $mesesTotal, $montoCuota, $fVenc, $label]);
                            $dt->modify('first day of next month');
                            $diaCap = min($diaPago, (int)$dt->format('t'));
                            $dt->setDate((int)$dt->format('Y'), (int)$dt->format('n'), $diaCap);
                        }
                    }
                }

                // Si tiene movilidad
                if (isset($b['incluye_movilidad']) && $b['incluye_movilidad'] == 0 && !empty($b['mobility']) && $estado_nuevo === 'Pendiente') {
                    $mob = $b['mobility'];
                    $pdo->prepare("DELETE FROM ordenes_movilidad WHERE orden_id = ?")->execute([$id]);
                    $stmtMob = $pdo->prepare("INSERT INTO ordenes_movilidad (orden_id, monto, descripcion, fecha, proveedor_id) VALUES (?,?,?,?,?)");
                    $stmtMob->execute([
                        $id,
                        $mob['monto'],
                        $mob['descripcion'] ?? 'Movilidad de la orden',
                        $mob['fecha'] ?? date('Y-m-d'),
                        $mob['proveedor_id'] ?? null
                    ]);
                }

                // Si pasa a Pendiente y el número original era RQ, generar tokens y mandar correos
                if (strpos($currOC['numero_oc'], 'RQ-') === 0 && $estado_nuevo === 'Pendiente') {
                    require_once __DIR__ . '/../includes/mailer.php';
                    $token_gerente  = bin2hex(random_bytes(32));
                    $token_finanzas = bin2hex(random_bytes(32));
                    $exp = date('Y-m-d H:i:s', strtotime('+168 hours'));

                    $email_gerente  = Mailer::getEmail('gerente');
                    $email_finanzas = Mailer::getEmail('finanzas');

                    $st = $pdo->prepare("INSERT INTO ordenes_compra_tokens (orden_id, token, rol, expiracion, email_destinatario) VALUES (?,?,?,?,?)");
                    $st->execute([$id, $token_gerente,  'gerente_general', $exp, $email_gerente]);
                    $st->execute([$id, $token_finanzas, 'jefe_finanzas',   $exp, $email_finanzas]);

                    try {
                        Mailer::sendNewOCNotification($id, [
                            'gerente'  => $token_gerente,
                            'finanzas' => $token_finanzas
                        ]);
                    } catch (Exception $e) {
                        error_log("Error enviando correo OC $id: " . $e->getMessage());
                    }

                    // Notificar al creador de la requisición que ha sido convertida a orden
                    $msg = "Tu requisición {$currOC['numero_oc']} ha sido procesada por compras y convertida en la Orden {$numero_oc}. Ya entró al flujo de firmas.";
                    $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Requisición Procesada', ?, 'success')")
                        ->execute([$currOC['creado_por'], $msg]);
                }

                $pdo->commit();
                json_response(['ok' => true, 'id' => $id, 'numero_oc' => $numero_oc]);
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
                $ahora = date('Y-m-d H:i:s');
                if ($rol === 'admin') {
                    $stmt = $pdo->prepare("UPDATE ordenes_compra SET aprobado_gerente = 1, aprobado_finanzas = 1, fecha_aprobacion_gerente = ?, fecha_aprobacion_finanzas = ?, fecha_aprobacion = ? WHERE id = ?");
                    $stmt->execute([ $ahora, $ahora, $ahora, $id ]);
                } else {
                    if ($rol === 'gerente_general') {
                        $stmt = $pdo->prepare("UPDATE ordenes_compra SET aprobado_gerente = 1, fecha_aprobacion_gerente = ? WHERE id = ?");
                        $stmt->execute([ $ahora, $id ]);
                    } else if ($rol === 'jefe_finanzas') {
                        $stmt = $pdo->prepare("UPDATE ordenes_compra SET aprobado_finanzas = 1, fecha_aprobacion_finanzas = ? WHERE id = ?");
                        $stmt->execute([ $ahora, $id ]);
                    }
                }
                
                // Si ambos aprobaron, cambiar estado a 'Aprobada'
                $stmtCheck = $pdo->prepare("SELECT aprobado_gerente, aprobado_finanzas, fecha_aprobacion FROM ordenes_compra WHERE id = ?");
                $stmtCheck->execute([$id]);
                $oc = $stmtCheck->fetch();
                if ($oc['aprobado_gerente'] && $oc['aprobado_finanzas']) {
                    if (empty($oc['fecha_aprobacion'])) {
                        $pdo->prepare("UPDATE ordenes_compra SET estado = 'Aprobada', fecha_aprobacion = ? WHERE id = ?")->execute([$ahora, $id]);
                    } else {
                        $pdo->prepare("UPDATE ordenes_compra SET estado = 'Aprobada' WHERE id = ?")->execute([$id]);
                    }
                    
                    // Notificar al creador
                    $msg = "La " . ($ocInfo['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$ocInfo['numero_oc']} ha sido APROBADA totalmente.";
                    $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documento Aprobado', ?, 'success')")
                        ->execute([$ocInfo['creado_por'], $msg]);

                    // Enviar correo a Tesorería
                    try {
                        require_once __DIR__ . '/../includes/mailer.php';
                        Mailer::sendApprovedRequisitionToTreasury($id);
                    } catch (Exception $e) {
                        error_log("Error enviando correo de aprobación a tesorería para OC/OS $id: " . $e->getMessage());
                    }
                } else {
                    // Notificar aprobación parcial
                    $quien = ($rol === 'gerente_general' ? 'el Gerente General' : 'el Jefe de Finanzas');
                    $msg = "{$quien} ha aprobado la " . ($ocInfo['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$ocInfo['numero_oc']}. Falta una firma.";
                    $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Aprobación Parcial', ?, 'info')")
                        ->execute([$ocInfo['creado_por'], $msg]);
                }
            } else if (($b['action'] ?? '') === 'clear_voucher') {
                // Solo el administrador (rol = 'admin') puede borrar vouchers
                $user_id = $b['usuario_id'] ?? null;
                if (!$user_id) json_response(['error' => 'Usuario requerido'], 400);

                $stmtUser = $pdo->prepare("SELECT r.nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?");
                $stmtUser->execute([$user_id]);
                $rol_nombre = $stmtUser->fetchColumn();

                if ($rol_nombre !== 'admin') {
                    json_response(['error' => 'Solo el administrador puede eliminar vouchers.'], 403);
                }

                $type = $b['type'] ?? null; // 'cuota', 'adelanto', 'saldo', 'mobility'
                if ($type === 'cuota') {
                    $cuota_id = $b['cuota_id'] ?? null;
                    if (!$cuota_id) json_response(['error' => 'cuota_id requerido'], 400);
                    
                    $stmt = $pdo->prepare("UPDATE ordenes_cuotas SET pagado = 0, fecha_pago = NULL, voucher_url = NULL WHERE id = ? AND orden_id = ?");
                    $stmt->execute([$cuota_id, $id]);
                    
                    // Si se anula una cuota, desmarcar la OC/OS de pagado completo
                    $pdo->prepare("UPDATE ordenes_compra SET pagado = 0, fecha_pago = NULL WHERE id = ?")->execute([$id]);
                } else if ($type === 'adelanto') {
                    $stmt = $pdo->prepare("UPDATE ordenes_compra SET adelanto_pagado = 0, adelanto_fecha = NULL, adelanto_voucher = NULL WHERE id = ?");
                    $stmt->execute([$id]);
                } else if ($type === 'saldo' || $type === 'pago_unico') {
                    $stmt = $pdo->prepare("UPDATE ordenes_compra SET pagado = 0, fecha_pago = NULL, voucher_url = NULL WHERE id = ?");
                    $stmt->execute([$id]);
                } else if ($type === 'mobility') {
                    $stmt = $pdo->prepare("UPDATE ordenes_movilidad SET pagado = 0, fecha_pago = NULL, voucher_url = NULL WHERE orden_id = ?");
                    $stmt->execute([$id]);
                } else {
                    json_response(['error' => 'Tipo de voucher no soportado'], 400);
                }

                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'pay_cuota') {
                // Pagar una cuota individual
                $cuota_id = $b['cuota_id'] ?? null;
                if (!$cuota_id) json_response(['error' => 'cuota_id requerido'], 400);
                $stmt = $pdo->prepare("UPDATE ordenes_cuotas SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE id = ? AND orden_id = ?");
                $stmt->execute([$b['voucher_url'] ?? null, $cuota_id, $id]);

                // Notificar al proveedor sobre la cuota pagada
                $ocFull = $pdo->prepare("
                    SELECT oc.numero_oc, oc.moneda, p.razon_social as proveedor_nombre, p.email as proveedor_email, 
                           c.numero_cuota, c.total_cuotas, c.monto_cuota
                    FROM ordenes_compra oc 
                    JOIN proveedores p ON oc.proveedor_id = p.id 
                    JOIN ordenes_cuotas c ON c.orden_id = oc.id
                    WHERE oc.id = ? AND c.id = ?
                ");
                $ocFull->execute([$id, $cuota_id]);
                $ocData = $ocFull->fetch();

                if ($ocData && $ocData['proveedor_email'] && ($b['voucher_url'] ?? null)) {
                    require_once __DIR__ . '/../includes/mailer.php';
                    Mailer::sendPaymentVoucherToSupplier([
                        'to' => $ocData['proveedor_email'],
                        'subject' => "Confirmación de Pago (Cuota {$ocData['numero_cuota']}/{$ocData['total_cuotas']}): {$ocData['numero_oc']}",
                        'provider' => $ocData['proveedor_nombre'],
                        'oc_number' => $ocData['numero_oc'],
                        'concept' => "Pago de Cuota N° {$ocData['numero_cuota']} de {$ocData['total_cuotas']} de la Orden de Compra/Servicio",
                        'monto' => $ocData['monto_cuota'],
                        'moneda' => $ocData['moneda'],
                        'voucher_url' => $b['voucher_url']
                    ]);
                }

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

                // Notificar al proveedor sobre el adelanto
                $ocFull = $pdo->prepare("SELECT oc.*, p.razon_social as proveedor_nombre, p.email as proveedor_email FROM ordenes_compra oc JOIN proveedores p ON oc.proveedor_id = p.id WHERE oc.id = ?");
                $ocFull->execute([$id]);
                $ocData = $ocFull->fetch();

                if ($ocData && $ocData['proveedor_email'] && $b['voucher_url']) {
                    require_once __DIR__ . '/../includes/mailer.php';
                    Mailer::sendPaymentVoucherToSupplier([
                        'to' => $ocData['proveedor_email'],
                        'subject' => "Confirmación de Pago (Adelanto): {$ocData['numero_oc']}",
                        'provider' => $ocData['proveedor_nombre'],
                        'oc_number' => $ocData['numero_oc'],
                        'concept' => 'Pago de ADELANTO de la Orden de Compra/Servicio',
                        'monto' => $ocData['adelanto_monto'],
                        'moneda' => $ocData['moneda'],
                        'voucher_url' => $b['voucher_url']
                    ]);
                }

                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'pay') {
                $stmt = $pdo->prepare("UPDATE ordenes_compra SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE id = ?");
                $stmt->execute([$b['voucher_url'], $id]);

                // Notificar al proveedor principal
                $ocFull = $pdo->prepare("SELECT oc.*, p.razon_social as proveedor_nombre, p.email as proveedor_email FROM ordenes_compra oc JOIN proveedores p ON oc.proveedor_id = p.id WHERE oc.id = ?");
                $ocFull->execute([$id]);
                $ocData = $ocFull->fetch();

                if ($ocData && $ocData['proveedor_email'] && $b['voucher_url']) {
                    $montoNotif = $ocData['condicion_pago'] === 'Adelanto + Saldo' ? $ocData['saldo_monto'] : $ocData['total'];
                    $conceptNotif = $ocData['condicion_pago'] === 'Adelanto + Saldo' ? 'Pago de SALDO de la Orden de Compra/Servicio' : 'Pago de la Orden de Compra/Servicio';

                    require_once __DIR__ . '/../includes/mailer.php';
                    Mailer::sendPaymentVoucherToSupplier([
                        'to' => $ocData['proveedor_email'],
                        'subject' => "Confirmación de Pago: {$ocData['numero_oc']}",
                        'provider' => $ocData['proveedor_nombre'],
                        'oc_number' => $ocData['numero_oc'],
                        'concept' => $conceptNotif,
                        'monto' => $montoNotif,
                        'moneda' => $ocData['moneda'],
                        'voucher_url' => $b['voucher_url']
                    ]);
                }

                // Pagar movilidad si viene el voucher por separado
                if (isset($b['voucher_movilidad_url']) && $b['voucher_movilidad_url']) {
                    $stmtMob = $pdo->prepare("UPDATE ordenes_movilidad SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE orden_id = ?");
                    $stmtMob->execute([$b['voucher_movilidad_url'], $id]);

                    // Notificar al proveedor de movilidad
                    $mobFull = $pdo->prepare("SELECT m.*, p.razon_social as proveedor_nombre, p.email as proveedor_email 
                                            FROM ordenes_movilidad m 
                                            JOIN proveedores p ON m.proveedor_id = p.id 
                                            WHERE m.orden_id = ?");
                    $mobFull->execute([$id]);
                    $mobData = $mobFull->fetch();

                    if ($mobData && $mobData['proveedor_email']) {
                        require_once __DIR__ . '/../includes/mailer.php';
                        Mailer::sendPaymentVoucherToSupplier([
                            'to' => $mobData['proveedor_email'],
                            'subject' => "Confirmación de Pago de Movilidad: {$ocData['numero_oc']}",
                            'provider' => $mobData['proveedor_nombre'],
                            'oc_number' => $ocData['numero_oc'] . " (MOVILIDAD)",
                            'concept' => 'Pago por servicio de movilidad / transporte',
                            'monto' => $mobData['monto'],
                            'moneda' => $ocData['moneda'],
                            'voucher_url' => $b['voucher_movilidad_url']
                        ]);
                    }
                }
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'pay_mobility') {
                $stmtMob = $pdo->prepare("UPDATE ordenes_movilidad SET pagado = 1, fecha_pago = NOW(), voucher_url = ? WHERE orden_id = ?");
                $stmtMob->execute([$b['voucher_url'], $id]);

                // Notificar al proveedor de movilidad
                $mobFull = $pdo->prepare("SELECT m.*, p.razon_social as proveedor_nombre, p.email as proveedor_email, oc.numero_oc, oc.moneda
                                        FROM ordenes_movilidad m 
                                        JOIN proveedores p ON m.proveedor_id = p.id 
                                        JOIN ordenes_compra oc ON m.orden_id = oc.id
                                        WHERE m.orden_id = ?");
                $mobFull->execute([$id]);
                $mobData = $mobFull->fetch();

                if ($mobData && $mobData['proveedor_email']) {
                    require_once __DIR__ . '/../includes/mailer.php';
                    Mailer::sendPaymentVoucherToSupplier([
                        'to' => $mobData['proveedor_email'],
                        'subject' => "Confirmación de Pago de Movilidad: {$mobData['numero_oc']}",
                        'provider' => $mobData['proveedor_nombre'],
                        'oc_number' => $mobData['numero_oc'] . " (MOVILIDAD)",
                        'concept' => 'Pago por servicio de movilidad / transporte',
                        'monto' => $mobData['monto'],
                        'moneda' => $mobData['moneda'],
                        'voucher_url' => $b['voucher_url']
                    ]);
                }
                json_response(['ok' => true]);
            } else if (($b['action'] ?? '') === 'resend_payment_email') {
                $type = $b['payment_type'] ?? null; // 'cuota', 'adelanto', 'saldo', 'mobility'
                $cuota_id = $b['cuota_id'] ?? null;

                // 1. Fetch the OC details and proveedor email
                $ocFull = $pdo->prepare("
                    SELECT oc.*, p.razon_social as proveedor_nombre, p.email as proveedor_email, p.contacto as proveedor_contacto 
                    FROM ordenes_compra oc 
                    JOIN proveedores p ON oc.proveedor_id = p.id 
                    WHERE oc.id = ?
                ");
                $ocFull->execute([$id]);
                $ocData = $ocFull->fetch();
                if (!$ocData) json_response(['error' => 'Orden no encontrada'], 404);

                $toEmail = $ocData['proveedor_email'];
                $provName = $ocData['proveedor_nombre'];
                $voucherUrl = null;
                $monto = 0;
                $concept = '';
                $subject = '';

                if ($type === 'cuota') {
                    if (!$cuota_id) json_response(['error' => 'cuota_id requerido'], 400);
                    $stmtCuota = $pdo->prepare("SELECT * FROM ordenes_cuotas WHERE id = ? AND orden_id = ?");
                    $stmtCuota->execute([$cuota_id, $id]);
                    $c = $stmtCuota->fetch();
                    if (!$c || !$c['pagado']) json_response(['error' => 'La cuota no está pagada o no existe'], 400);
                    
                    $voucherUrl = $c['voucher_url'];
                    $monto = $c['monto_cuota'];
                    $concept = "Reenvío: Pago de Cuota N° {$c['numero_cuota']} de {$c['total_cuotas']} de la Orden de Compra/Servicio";
                    $subject = "Confirmación de Pago (Cuota {$c['numero_cuota']}/{$c['total_cuotas']}): {$ocData['numero_oc']}";
                } else if ($type === 'adelanto') {
                    if (!$ocData['adelanto_pagado']) json_response(['error' => 'El adelanto no está pagado'], 400);
                    $voucherUrl = $ocData['adelanto_voucher'];
                    $monto = $ocData['adelanto_monto'];
                    $concept = "Reenvío: Pago de ADELANTO de la Orden de Compra/Servicio";
                    $subject = "Confirmación de Pago (Adelanto): {$ocData['numero_oc']}";
                } else if ($type === 'saldo') {
                    if (!$ocData['pagado']) json_response(['error' => 'La orden no está pagada'], 400);
                    $voucherUrl = $ocData['voucher_url'];
                    $monto = $ocData['condicion_pago'] === 'Adelanto + Saldo' ? $ocData['saldo_monto'] : $ocData['total'];
                    $concept = "Reenvío: Pago de " . ($ocData['condicion_pago'] === 'Adelanto + Saldo' ? 'SALDO' : 'la Orden de Compra/Servicio');
                    $subject = "Confirmación de Pago: {$ocData['numero_oc']}";
                } else if ($type === 'mobility') {
                    $stmtMob = $pdo->prepare("
                        SELECT m.*, p.razon_social as mob_razon, p.email as mob_email, p.contacto as mob_contacto 
                        FROM ordenes_movilidad m 
                        JOIN proveedores p ON m.proveedor_id = p.id 
                        WHERE m.orden_id = ?
                    ");
                    $stmtMob->execute([$id]);
                    $mob = $stmtMob->fetch();
                    if (!$mob || !$mob['pagado']) json_response(['error' => 'El pago de movilidad no está registrado o no existe'], 400);
                    
                    $toEmail = $mob['mob_email'];
                    $provName = $mob['mob_razon'];
                    $voucherUrl = $mob['voucher_url'];
                    $monto = $mob['monto'];
                    $concept = "Reenvío: Pago por servicio de movilidad / transporte";
                    $subject = "Confirmación de Pago de Movilidad: {$ocData['numero_oc']}";
                } else {
                    json_response(['error' => 'Tipo de pago no soportado'], 400);
                }

                if (empty($toEmail)) json_response(['error' => 'El destinatario no tiene correo registrado'], 400);
                if (empty($voucherUrl)) json_response(['error' => 'No hay voucher registrado para este pago'], 400);

                require_once __DIR__ . '/../includes/mailer.php';
                try {
                    $mailData = [
                        'to' => $toEmail,
                        'cc' => 'compras@colegiolacatolica.edu.pe',
                        'subject' => $subject,
                        'provider' => $provName,
                        'contact' => $ocData['proveedor_contacto'],
                        'oc_number' => $ocData['numero_oc'],
                        'concept' => $concept,
                        'monto' => $monto,
                        'amount' => $monto,
                        'moneda' => $ocData['moneda'] ?? 'PEN',
                        'voucher_url' => $voucherUrl
                    ];

                    if (@Mailer::sendPaymentVoucherToSupplier($mailData)) {
                        json_response(['ok' => true]);
                    } else {
                        json_response(['error' => 'El servidor de correo rechazó el envío.'], 500);
                    }
                } catch (Throwable $mailEx) {
                    json_response(['error' => 'Error interno al procesar el correo: ' . $mailEx->getMessage()], 500);
                }
            } else if (($b['action'] ?? '') === 'receive') {
                $conformidad = $b['conformidad_url'] ?? null;
                $comprobante = $b['comprobante_url'] ?? null;
                $sin_conformidad = $b['sin_conformidad'] ?? 0;
                
                $sets = [];
                $params = [];
                
                if ($conformidad) {
                    $sets[] = "conformidad_url = ?, fecha_conformidad = NOW(), sin_conformidad = 0";
                    $params[] = $conformidad;
                }
                if ($comprobante) {
                    $sets[] = "comprobante_url = ?, fecha_recepcion = NOW()";
                    $params[] = $comprobante;
                }
                if (isset($b['sin_conformidad'])) {
                    $sets[] = "sin_conformidad = ?";
                    $params[] = $sin_conformidad;
                }
                
                if (empty($sets)) json_response(['error' => 'No se proporcionó documento'], 400);
                
                $sql = "UPDATE ordenes_compra SET " . implode(", ", $sets) . " WHERE id = ?";
                $params[] = $id;
                $pdo->prepare($sql)->execute($params);
                
                // --- NOTIFICACIONES A TESORERÍA ---
                if ($conformidad || $sin_conformidad == 1) {
                    // Notificación solo en el sistema y solo a tesoreros activos
                    $stmtTes = $pdo->prepare("SELECT u.id FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE r.id = 'tesoreria' AND u.estado = 'activo'");
                    $stmtTes->execute();
                    $tesoreros = $stmtTes->fetchAll();
                    
                    $ocNum = $pdo->query("SELECT numero_oc FROM ordenes_compra WHERE id = $id")->fetchColumn();
                    $msg = "Se ha subido la " . ($sin_conformidad == 1 ? 'ausencia de ' : '') . "conformidad para la orden $ocNum. Ya puede procesar el pago.";
                    
                    foreach ($tesoreros as $t) {
                        $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documentación Lista', ?, 'info')")
                            ->execute([$t['id'], $msg]);
                    }
                }

                // Verificar si ambos están para cambiar estado a 'Recibida'
                $check = $pdo->prepare("SELECT conformidad_url, comprobante_url, sin_conformidad, tipo, numero_oc, creado_por FROM ordenes_compra WHERE id = ?");
                $check->execute([$id]);
                $curr = $check->fetch();
                
                if (($curr['conformidad_url'] || $curr['sin_conformidad'] == 1) && $curr['comprobante_url']) {
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
                            if ($item['categoria_tipo'] === 'insumo' || $item['categoria_tipo'] === 'mobiliario') {
                                $factor = !empty($item['factor_conversion']) ? floatval($item['factor_conversion']) : 1.00;
                                $cantidadConvertida = intval(round($item['cantidad'] * $factor));

                                $obs = "Entrada automática por recepción de " . $ocData['numero_oc'];
                                if ($factor != 1.00) {
                                    $obs .= " (" . $item['cantidad'] . " " . ($item['unidad'] ?: 'Und.') . " x " . $factor . ")";
                                }

                                // Registrar movimiento de entrada automático
                                $mov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, observacion, fecha) VALUES (?, 'Entrada', ?, ?, NOW())");
                                $mov->execute([
                                    $item['item_id'], 
                                    $cantidadConvertida, 
                                    $obs
                                ]);
                            } else if ($item['categoria_tipo'] === 'equipo' || $item['categoria_tipo'] === 'activo') {
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
                } else if ($type === 'mobility') {
                    $sqlMob = "SELECT oc.*, m.voucher_url as mob_voucher, m.monto as mob_monto,
                                      p.razon_social as mob_razon, p.email as mob_email, p.contacto as mob_contacto 
                               FROM ordenes_compra oc 
                               JOIN ordenes_movilidad m ON oc.id = m.orden_id
                               JOIN proveedores p ON m.proveedor_id = p.id 
                               WHERE oc.id = ?";
                    $stmtMob = $pdo->prepare($sqlMob);
                    $stmtMob->execute([$id]);
                    $mobInfo = $stmtMob->fetch();
                    
                    if (!$mobInfo) json_response(['error' => 'No hay movilidad registrada para esta orden'], 404);
                    if (empty($mobInfo['mob_email'])) json_response(['error' => 'El transportista no tiene correo registrado'], 400);
                    
                    // Sobrescribir datos del receptor para el Mailer
                    $oc['proveedor_email'] = $mobInfo['mob_email'];
                    $oc['razon_social'] = $mobInfo['mob_razon'];
                    $oc['proveedor_contacto'] = $mobInfo['mob_contacto'];
                    
                    $voucher_url = $mobInfo['mob_voucher'];
                    $concepto = "Servicio de Movilidad / Transporte";
                    $monto = $mobInfo['mob_monto'];
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
                    'monto' => $monto,
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
            $user_id = $_GET['usuario_id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            if (!$user_id) json_response(['error' => 'Usuario no especificado para la eliminación'], 400);

            // Validar que sea administrador
            $stmtUser = $pdo->prepare("SELECT r.nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?");
            $stmtUser->execute([$user_id]);
            $rol_nombre = $stmtUser->fetchColumn();

            if ($rol_nombre !== 'admin') {
                json_response(['error' => 'Solo el administrador puede eliminar requisiciones/órdenes.'], 403);
            }
            
            $pdo->beginTransaction();
            // Eliminar registros relacionados primero
            $pdo->prepare("DELETE FROM ordenes_compra_items WHERE orden_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM ordenes_cuotas WHERE orden_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM ordenes_movilidad WHERE orden_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM ordenes_compra_tokens WHERE orden_id = ?")->execute([$id]);
            
            // Eliminar la orden principal
            $pdo->prepare("DELETE FROM ordenes_compra WHERE id = ?")->execute([$id]);
            $pdo->commit();
            
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
