<?php
// api/recepcions.php — Procesamiento de recepción de OC y conformidad de OS
ob_start(); // Capturar cualquier output (warnings) antes del JSON
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── PATCH: subir comprobante (factura) a una orden ya recibida ─────────────
if ($method === 'PATCH') {
    try {
        $pdo = db();
        $b = get_body();
        $purchase_id     = $b['purchase_id']     ?? null;
        $comprobante_url = $b['comprobante_url']  ?? null;
        $action          = $b['action']           ?? 'upload_factura';

        // ── SUB-ACCIÓN: subir factura para una cuota específica ───────────────
        if ($action === 'upload_cuota_factura') {
            $cuota_id = $b['cuota_id'] ?? null;
            if (!$purchase_id || !$cuota_id || !$comprobante_url) {
                json_response(['error' => 'purchase_id, cuota_id y comprobante_url son requeridos'], 400);
            }
            // Verificar que la cuota pertenece a esta orden
            $stmt = $pdo->prepare("SELECT id, numero_cuota, total_cuotas FROM ordenes_cuotas WHERE id = ? AND orden_id = ?");
            $stmt->execute([$cuota_id, $purchase_id]);
            $cuota = $stmt->fetch();
            if (!$cuota) json_response(['error' => 'Cuota no encontrada o no pertenece a esta orden'], 404);

            // Guardar la URL del comprobante en la cuota
            $pdo->prepare("UPDATE ordenes_cuotas SET comprobante_url = ? WHERE id = ? AND orden_id = ?")
                ->execute([$comprobante_url, $cuota_id, $purchase_id]);

            ob_clean();
            json_response([
                'ok' => true,
                'mensaje' => "Factura de Cuota {$cuota['numero_cuota']}/{$cuota['total_cuotas']} registrada correctamente."
            ]);
            exit;
        }

        // ── SUB-ACCIÓN DEFAULT: subir factura general a orden ya recibida ─────
        if (!$purchase_id || !$comprobante_url) {
            json_response(['error' => 'purchase_id y comprobante_url son requeridos'], 400);
        }

        // Obtener el estado actual de los documentos
        $stmt = $pdo->prepare("SELECT conformidad_url, comprobante_url FROM ordenes_compra WHERE id = ?");
        $stmt->execute([$purchase_id]);
        $row = $stmt->fetch();
        if (!$row) json_response(['error' => 'Orden no encontrada'], 404);

        // Guardar la URL del comprobante
        $pdo->prepare("UPDATE ordenes_compra SET comprobante_url = ? WHERE id = ?")
            ->execute([$comprobante_url, $purchase_id]);

        // Si ya tiene conformidad, marcar como Completada (ciclo documental cerrado)
        $ahora_completa = false;
        if (!empty($row['conformidad_url'])) {
            $pdo->prepare("UPDATE ordenes_compra SET estado = 'Completada' WHERE id = ? AND estado != 'Completada'")
                ->execute([$purchase_id]);
            $ahora_completa = true;
        }

        ob_clean();
        json_response(['ok' => true, 'completada' => $ahora_completa]);
    } catch (Throwable $e) {
        ob_clean();
        json_response(['error' => $e->getMessage()], 500);
    }
    exit;
}

if ($method !== 'POST') {
    json_response(['error' => 'Método no permitido'], 405);
}

try {
    $pdo = db();
    $b = get_body();
    $purchase_id = $b['purchase_id'] ?? null;

    if (!$purchase_id) {
        json_response(['error' => 'ID de orden requerido'], 400);
    }

    $pdo->beginTransaction();

    // 1. Obtener la orden
    $stmtOC = $pdo->prepare("
        SELECT oc.*, p.razon_social as proveedor_nombre 
        FROM ordenes_compra oc
        JOIN proveedores p ON oc.proveedor_id = p.id
        WHERE oc.id = ?
    ");
    $stmtOC->execute([$purchase_id]);
    $oc = $stmtOC->fetch();

    if (!$oc) {
        throw new Exception("La orden no existe.");
    }

    if ($oc['estado'] === 'Completada') {
        throw new Exception("Esta orden ya ha sido procesada.");
    }

    $ALMACEN_ID = 13; // Almacén Central / General
    $receivedItems = [];

    // 2. Procesar según tipo
    if ($oc['tipo'] === 'compra') {
        // --- CASO OC: INGRESO DE MERCADERÍA AL STOCK ---
        $stmtItems = $pdo->prepare("
            SELECT oci.*, i.nombre as item_nombre, ci.tipo as categoria_tipo, oci.categoria_nombre as backup_nombre
            FROM ordenes_compra_items oci
            LEFT JOIN items i ON oci.item_id = i.id
            LEFT JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id
            WHERE oci.orden_id = ?
        ");
        $stmtItems->execute([$purchase_id]);
        $items = $stmtItems->fetchAll();

        foreach ($items as $item) {
            $finalItemId = $item['item_id'];

            // ARQUITECTURA EXPERTA: Si el item_id no pertenece a un item real (sino a una categoría)
            // intentamos resolverlo al ítem maestro de esa categoría o creamos uno nuevo.
            $check = $pdo->prepare("SELECT id FROM items WHERE id = ?");
            $check->execute([$finalItemId]);
            if (!$check->fetch()) {
                // No es un item_id válido en la tabla items, probablemente es un category_id o un placeholder
                $resolve = $pdo->prepare("SELECT id FROM items WHERE categoria_inventario_id = ? LIMIT 1");
                $resolve->execute([$finalItemId]);
                $found = $resolve->fetch();
                
                if ($found) {
                    $finalItemId = $found['id'];
                } else {
                    // Si no existe ni siquiera un ítem para esa categoría, LO CREAMOS DE OFICIO
                    // Esto evita el error de llave foránea en movimientos y asegura el flujo.
                    $stmtNewItem = $pdo->prepare("INSERT INTO items (nombre, categoria_inventario_id, codigo) VALUES (?, ?, ?)");
                    $newCode = 'TEMP-' . time() . '-' . $finalItemId; // Código temporal, se sobreescribe en onboarding
                    $stmtNewItem->execute([
                        $item['item_nombre'] ?: ($item['backup_nombre'] ?: 'Artículo Nuevo'),
                        $item['item_id'], // El item_id de la OC es el category_id en este caso
                        $newCode
                    ]);
                    $finalItemId = $pdo->lastInsertId();
                }
            }

            if (!empty($finalItemId)) {
                // Obtener el tipo de categoría real (equipo, insumo, mobiliario)
                $stmtType = $pdo->prepare("
                    SELECT ci.tipo 
                    FROM items i 
                    JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id 
                    WHERE i.id = ?
                ");
                $stmtType->execute([$finalItemId]);
                $typeRow = $stmtType->fetch();
                $actualType = $typeRow ? $typeRow['tipo'] : 'insumo';

                // ARQUITECTURA EXPERTA: Solo registramos movimiento de stock directo para 'insumo' o 'mobiliario'.
                // Los 'equipo' requieren un alta individualizada (serie, qr, etc) que se maneja en el asistente de alta.
                $cantidadConvertida = $item['cantidad']; // Inicializar con cantidad base (sobreescrito si hay factor)
                if ($actualType !== 'equipo') {
                    $factor = !empty($item['factor_conversion']) ? floatval($item['factor_conversion']) : 1.00;
                    $cantidadConvertida = intval(round($item['cantidad'] * $factor));

                    $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
                    
                    $obs = "Recepción de OC " . $purchase_id;
                    if ($factor != 1.00) {
                        $obs .= " (" . $item['cantidad'] . " " . ($item['unidad'] ?: 'Und.') . " x " . $factor . ")";
                    }

                    $stmtMov->execute([
                        $finalItemId, 
                        $cantidadConvertida, 
                        $b['ubicacion_id'] ?? 13, // Usar ubicación seleccionada o Almacén General por defecto
                        $obs
                    ]);
                }
                
                $receivedItems[] = [
                    'item_id' => $finalItemId,
                    'nombre' => $item['item_nombre'] ?: ($item['backup_nombre'] ?: 'Artículo S/N'),
                    'cantidad' => ($actualType === 'equipo') ? $item['cantidad'] : $cantidadConvertida,
                    'tipo' => $actualType
                ];
            }
        }
    } else {
        // --- CASO OS: CONFORMIDAD DE SERVICIO / MANTENIMIENTO ---
        $stmtMaint = $pdo->prepare("SELECT * FROM mantenimientos WHERE orden_compra_id = ? AND estado != 'Completado'");
        $stmtMaint->execute([$purchase_id]);
        $maints = $stmtMaint->fetchAll();

        foreach ($maints as $m) {
            $pdo->prepare("UPDATE mantenimientos SET estado = 'Completado', fecha_fin = CURRENT_DATE, descripcion_solucion = 'Servicio conforme según OS' WHERE id = ?")
                ->execute([$m['id']]);

            $finalUbicacionId = $ALMACEN_ID; // Fallback

            if (!empty($m['activo_id'])) {
                // QA FIX: Obtener ubicación original del activo para evitar 'teletransportación' al almacén general
                $stmtLoc = $pdo->prepare("SELECT ubicacion_id FROM activos WHERE id = ?");
                $stmtLoc->execute([$m['activo_id']]);
                $locRow = $stmtLoc->fetch();
                if ($locRow) $finalUbicacionId = $locRow['ubicacion_id'];

                $pdo->prepare("UPDATE activos SET estado = 'Operativo' WHERE id = ?")
                    ->execute([$m['activo_id']]);
            }

            $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
            $obs = "Retorno por Conformidad de Servicio OS #" . $oc['numero_oc'];
            $stmtMov->execute([$m['item_id'], $m['cantidad'], $finalUbicacionId, $obs]);
        }
    }

    // 3. Marcar la orden como Recibida/Completada y guardar documentos
    $conformidad    = $b['conformidad_url']  ?? null;
    $comprobante    = $b['comprobante_url']  ?? null;

    // Si se suben ambos documentos (o ya se subió el comprobante previamente) → Completada; de lo contrario → Recibida
    $hasComprobante = !empty($comprobante) || !empty($oc['comprobante_url']);
    $nuevoEstado = ($conformidad && $hasComprobante) ? 'Completada' : 'Recibida';

    $sqlUpd = "UPDATE ordenes_compra SET estado = ?, fecha_recepcion = NOW()";
    $paramsUpd = [$nuevoEstado];

    if ($conformidad) {
        $sqlUpd .= ", conformidad_url = ?";
        $paramsUpd[] = $conformidad;
    }
    if ($comprobante) {
        $sqlUpd .= ", comprobante_url = ?";
        $paramsUpd[] = $comprobante;
    }
    $sqlUpd .= " WHERE id = ?";
    $paramsUpd[] = $purchase_id;

    $pdo->prepare($sqlUpd)->execute($paramsUpd);

    $pdo->commit();
    
    ob_clean(); // Garantizar JSON puro
    json_response(['ok' => true, 'received_items' => $receivedItems, 'estado' => $nuevoEstado]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    ob_clean();
    json_response(['error' => $e->getMessage()], 500);
}
