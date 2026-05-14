<?php
// api/assets.php — CRUD de activos individualizados
ob_start(); // Buffer para capturar cualquier warning antes del JSON
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $item_id = $_GET['item_id'] ?? null;
                if (!$item_id) json_response(['error' => 'item_id requerido'], 400);

                // LÓGICA EXPERTA: Código = {PREFIJO}-{NNNN}
                // El prefijo viene directamente de la categoría del ítem.
                $stmt = $pdo->prepare("
                    SELECT ci.prefijo 
                    FROM items i 
                    JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id 
                    WHERE i.id = ?
                ");
                $stmt->execute([$item_id]);
                $row = $stmt->fetch();
                $prefix = ($row && !empty($row['prefijo'])) ? strtoupper(trim($row['prefijo'])) : 'ACT';

                // Buscar el correlativo más alto en TODA la tabla activos con ese prefijo
                // Se usa REGEXP para evitar colisiones entre prefijos similares (MON vs MON-2)
                $likePattern = $prefix . '-%';
                $stmt2 = $pdo->prepare("SELECT codigo_interno FROM activos WHERE codigo_interno LIKE ?");
                $stmt2->execute([$likePattern]);
                $rows = $stmt2->fetchAll();

                $max = 0;
                foreach ($rows as $r) {
                    // Extraer el número al final: CPU-0003 → 3
                    if (preg_match('/-([0-9]+)$/', $r['codigo_interno'], $m)) {
                        $num = intval($m[1]);
                        if ($num > $max) $max = $num;
                    }
                }

                $nextCode = $prefix . '-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $nextCode, 'prefix' => $prefix]);
                break;
            }

            $rows = $pdo->query("
                SELECT a.*, i.nombre as item_nombre, i.codigo as item_codigo,
                       a.codigo_interno as codigo_patrimonial,
                       ci.nombre as categoria_nombre, 
                       u.nombre as ubicacion_nombre, u.id as ubicacion_id,
                       s.nombre as sede_nombre, s.id as sede_id,
                       p.nombre as responsable_nombre
                FROM activos a
                JOIN items i ON a.item_id = i.id
                LEFT JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id
                LEFT JOIN ubicaciones u ON a.ubicacion_id = u.id
                LEFT JOIN sedes s ON u.sede_id = s.id
                LEFT JOIN personal p ON a.personal_id = p.id
                ORDER BY a.id DESC
            ")->fetchAll();
            json_response(['assets' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            $pdo->beginTransaction();
            try {
                // Si no hay número de serie, generamos uno único automáticamente
                $serie = !empty($b['numero_serie']) ? $b['numero_serie'] : ('SN-' . time() . '-' . rand(100, 999));

                // LÓGICA EXPERTA: Si no viene codigo_interno, generarlo automáticamente
                $codigoInterno = $b['codigo_interno'] ?? null;
                if (empty($codigoInterno)) {
                    // Obtener prefijo de categoría
                    $stmtPfx = $pdo->prepare("
                        SELECT ci.prefijo FROM items i 
                        JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id 
                        WHERE i.id = ?
                    ");
                    $stmtPfx->execute([$b['item_id']]);
                    $pfxRow = $stmtPfx->fetch();
                    $prefix = ($pfxRow && !empty($pfxRow['prefijo'])) ? strtoupper(trim($pfxRow['prefijo'])) : 'ACT';

                    // Buscar el correlativo más alto para ese prefijo
                    $stmtMax = $pdo->prepare("SELECT codigo_interno FROM activos WHERE codigo_interno LIKE ?");
                    $stmtMax->execute([$prefix . '-%']);
                    $maxNum = 0;
                    foreach ($stmtMax->fetchAll() as $r) {
                        if (preg_match('/-([0-9]+)$/', $r['codigo_interno'], $mm)) {
                            if (intval($mm[1]) > $maxNum) $maxNum = intval($mm[1]);
                        }
                    }
                    $codigoInterno = $prefix . '-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);
                }

                $sql = "INSERT INTO activos (numero_serie, codigo_interno, item_id, ubicacion_id, personal_id, estado, observaciones_tecnicas) VALUES (?,?,?,?,?,?,?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $serie,
                    $codigoInterno,
                    $b['item_id'],
                    $b['ubicacion_id'] ?: null,
                    $b['personal_id'] ?: null,
                    $b['estado'] ?? 'Operativo',
                    $b['observaciones_tecnicas'] ?? null
                ]);
                $assetId = $pdo->lastInsertId();

                // Crear movimiento de entrada automático
                $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, observacion) VALUES (?, 'Entrada', 1, ?)");
                $stmtMov->execute([$b['item_id'], "Registro de activo: Serie " . $serie]);

                // LÓGICA EXPERTA: Actualizar metadatos del Ítem Maestro (Marca/Modelo)
                if (!empty($b['marca']) || !empty($b['modelo'])) {
                    $stmtUpdItem = $pdo->prepare("UPDATE items SET marca = ?, modelo = ? WHERE id = ?");
                    $stmtUpdItem->execute([
                        $b['marca'] ?? null,
                        $b['modelo'] ?? null,
                        $b['item_id']
                    ]);
                }

                // LIMPIEZA DE CÓDIGOS TEMPORALES
                $stmtCheckCode = $pdo->prepare("SELECT codigo FROM items WHERE id = ?");
                $stmtCheckCode->execute([$b['item_id']]);
                $itemCode = $stmtCheckCode->fetchColumn();
                // Protección PHP 8: verificar que $itemCode sea string antes de strpos
                if (is_string($itemCode) && strpos($itemCode, 'TEMP-') === 0 && !empty($codigoInterno)) {
                    $pdo->prepare("UPDATE items SET codigo = ? WHERE id = ?")->execute([$codigoInterno, $b['item_id']]);
                }

                $pdo->commit();
                ob_clean(); // Limpiar cualquier warning antes de enviar el JSON
                json_response(['ok' => true, 'id' => $assetId, 'codigo' => $codigoInterno]);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE activos SET numero_serie=?, codigo_interno=?, item_id=?, ubicacion_id=?, personal_id=?, estado=?, observaciones_tecnicas=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['numero_serie'],
                $b['codigo_interno'] ?? null,
                $b['item_id'],
                $b['ubicacion_id'] ?: null,
                $b['personal_id'] ?: null,
                $b['estado'] ?? 'Operativo',
                $b['observaciones_tecnicas'] ?? null,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM activos WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    ob_clean();
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
