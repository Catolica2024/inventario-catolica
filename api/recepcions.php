<?php
// api/recepcions.php — Procesamiento de recepción de OC y conformidad de OS
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

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
    $stmtOC = $pdo->prepare("SELECT * FROM ordenes_compra WHERE id = ?");
    $stmtOC->execute([$purchase_id]);
    $oc = $stmtOC->fetch();

    if (!$oc) {
        throw new Exception("La orden no existe.");
    }

    if ($oc['estado'] === 'Completada') {
        throw new Exception("Esta orden ya ha sido procesada.");
    }

    $ALMACEN_ID = 13; // Almacén Central / General

    // 2. Procesar según tipo
    if ($oc['tipo'] === 'compra') {
        // --- CASO OC: INGRESO DE MERCADERÍA AL STOCK ---
        $stmtItems = $pdo->prepare("SELECT * FROM ordenes_compra_items WHERE orden_id = ?");
        $stmtItems->execute([$purchase_id]);
        $items = $stmtItems->fetchAll();

        foreach ($items as $item) {
            if (!empty($item['item_id'])) {
                // Registrar movimiento de Entrada
                $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
                $obs = "Ingreso por OC #" . $oc['numero_oc'] . " - " . $oc['proveedor_nombre'];
                $stmtMov->execute([$item['item_id'], $item['cantidad'], $ALMACEN_ID, $obs]);
            }
        }
    } else {
        // --- CASO OS: CONFORMIDAD DE SERVICIO / MANTENIMIENTO ---
        // Buscamos si hay un mantenimiento vinculado a esta OS
        $stmtMaint = $pdo->prepare("SELECT * FROM mantenimientos WHERE orden_compra_id = ? AND estado != 'Completado'");
        $stmtMaint->execute([$purchase_id]);
        $maints = $stmtMaint->fetchAll();

        foreach ($maints as $m) {
            // 1. Actualizar el mantenimiento a Completado
            $pdo->prepare("UPDATE mantenimientos SET estado = 'Completado', fecha_fin = CURRENT_DATE, descripcion_solucion = 'Servicio conforme según OS' WHERE id = ?")
                ->execute([$m['id']]);

            // 2. Si es un activo específico, volver a ponerlo como Operativo
            if (!empty($m['activo_id'])) {
                $pdo->prepare("UPDATE activos SET estado = 'Operativo' WHERE id = ?")
                    ->execute([$m['activo_id']]);
            }

            // 3. Registrar entrada de vuelta al stock (ya que el mantenimiento hizo una salida inicial)
            $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
            $obs = "Retorno por Conformidad de Servicio OS #" . $oc['numero_oc'];
            $stmtMov->execute([$m['item_id'], $m['cantidad'], $ALMACEN_ID, $obs]);
        }
    }

    // 3. Marcar la orden como Completada
    $pdo->prepare("UPDATE ordenes_compra SET estado = 'Completada' WHERE id = ?")->execute([$purchase_id]);

    $pdo->commit();
    json_response(['ok' => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['error' => $e->getMessage()], 500);
}
