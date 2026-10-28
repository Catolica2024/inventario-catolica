<?php
// api/import_excel.php — Endpoint para importación masiva desde Excel
ob_start();
require_once __DIR__ . '/../includes/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = db();
    
    // Leer datos del payload JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !is_array($data)) {
        throw new Exception("Datos inválidos proporcionados o archivo vacío.");
    }

    $pdo->beginTransaction();

    // Cargar categorías y ubicaciones existentes para coincidencia difusa (fuzzy matching)
    $stmtCats = $pdo->query("SELECT id, nombre, tipo, prefijo FROM categorias_inventario");
    $existingCats = $stmtCats->fetchAll(PDO::FETCH_ASSOC);

    $stmtLocs = $pdo->query("SELECT id, nombre FROM ubicaciones");
    $existingLocs = $stmtLocs->fetchAll(PDO::FETCH_ASSOC);

    $stats = [
        'items_creados' => 0,
        'activos_creados' => 0,
        'stock_actualizado' => 0,
        'errores' => []
    ];

    foreach ($data as $index => $row) {
        $rowNum = $index + 2; // Asumiendo que la fila 1 es encabezado
        try {
            $nombreArticulo = trim($row['Nombre del artículo'] ?? $row['Nombre del articulo'] ?? $row['nombre'] ?? '');
            $marca = trim($row['Marca'] ?? $row['marca'] ?? '');
            $modelo = trim($row['Modelo'] ?? $row['modelo'] ?? '');
            $nroSerie = trim($row['Nro de Serie'] ?? $row['Nr de serie'] ?? $row['Nr Serie'] ?? $row['NR DE SERIE'] ?? $row['Numero de serie'] ?? $row['Número de serie'] ?? $row['numero_serie'] ?? $row['Serie'] ?? $row['serie'] ?? '');
            $tipoStr = trim($row['Tipo'] ?? $row['tipo'] ?? '');
            $categoriaStr = trim($row['Categoria'] ?? $row['Categoría'] ?? $row['categoria'] ?? '');
            $ubicacionStr = trim($row['Ubicación'] ?? $row['Ubicacion'] ?? $row['ubicacion'] ?? '');
            $stock = (int)($row['stock'] ?? $row['Stock'] ?? 1);
            $estadoExcel = trim($row['Estado'] ?? $row['estado'] ?? '');
            $descripcion = trim($row['descripción'] ?? $row['Descripción'] ?? $row['descripcion'] ?? '');

            if (empty($nombreArticulo)) continue;

            // 1. Mapear 'Tipo'
            $tipo = 'insumo';
            if (stripos($tipoStr, 'mobil') !== false) $tipo = 'mobiliario';
            if (stripos($tipoStr, 'activ') !== false) $tipo = 'activo';
            if (stripos($tipoStr, 'equip') !== false) $tipo = 'equipo';

            // 2. Mapear 'Estado'
            $estadoDb = 'Operativo';
            $estLower = strtolower($estadoExcel);
            if (strpos($estLower, 'mal') !== false || strpos($estLower, 'baja') !== false) {
                $estadoDb = 'Baja';
            } elseif (strpos($estLower, 'repar') !== false) {
                $estadoDb = 'Reparación';
            } elseif (strpos($estLower, 'observ') !== false || strpos($estLower, 'manten') !== false) {
                $estadoDb = 'Mantenimiento';
            }

            // 3. Buscar o crear Categoría
            $catId = null;
            $bestMatchScore = 0;
            if (!empty($categoriaStr)) {
                foreach ($existingCats as $cat) {
                    similar_text(strtolower($categoriaStr), strtolower($cat['nombre']), $percent);
                    if ($percent > 85 && $percent > $bestMatchScore) {
                        $bestMatchScore = $percent;
                        $catId = $cat['id'];
                    }
                }
                if ($catId) {
                    // Actualizar el tipo de la categoría si el Excel especifica uno explícitamente y es diferente
                    foreach ($existingCats as &$catRef) {
                        if ($catRef['id'] == $catId && $catRef['tipo'] != $tipo) {
                            $pdo->prepare("UPDATE categorias_inventario SET tipo = ? WHERE id = ?")->execute([$tipo, $catId]);
                            $catRef['tipo'] = $tipo;
                            break;
                        }
                    }
                } else {
                    // Generar prefijo de 3 caracteres
                    $prefijo = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $categoriaStr), 0, 3));
                    if (strlen($prefijo) < 3) $prefijo = str_pad($prefijo, 3, 'X');
                    
                    $prefijoBase = $prefijo;
                    $c = 1;
                    while(true) {
                        $chk = $pdo->prepare("SELECT id FROM categorias_inventario WHERE prefijo = ?");
                        $chk->execute([$prefijo]);
                        if(!$chk->fetch()) break;
                        $prefijo = substr($prefijoBase, 0, 2) . $c;
                        $c++;
                    }
                    
                    $stmt = $pdo->prepare("INSERT INTO categorias_inventario (nombre, descripcion, tipo, prefijo) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$categoriaStr, "Importado desde Excel", $tipo, $prefijo]);
                    $catId = $pdo->lastInsertId();
                    $existingCats[] = ['id' => $catId, 'nombre' => $categoriaStr, 'tipo' => $tipo, 'prefijo' => $prefijo];
                }
            }

            // 4. Buscar o crear Ubicación
            $locId = null;
            $bestMatchScoreLoc = 0;
            if (!empty($ubicacionStr)) {
                foreach ($existingLocs as $loc) {
                    similar_text(strtolower($ubicacionStr), strtolower($loc['nombre']), $percent);
                    if ($percent > 85 && $percent > $bestMatchScoreLoc) {
                        $bestMatchScoreLoc = $percent;
                        $locId = $loc['id'];
                    }
                }
                if (!$locId) {
                    $codLoc = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $ubicacionStr), 0, 5));
                    if (strlen($codLoc) < 3) $codLoc = str_pad($codLoc, 3, 'X');
                    $codBase = $codLoc;
                    $c = 1;
                    while(true) {
                        $chk = $pdo->prepare("SELECT id FROM ubicaciones WHERE codigo = ?");
                        $chk->execute([$codLoc]);
                        if(!$chk->fetch()) break;
                        $codLoc = substr($codBase, 0, 4) . $c;
                        $c++;
                    }
                    
                    $stmt = $pdo->prepare("INSERT INTO ubicaciones (codigo, nombre, estado) VALUES (?, ?, 'activo')");
                    $stmt->execute([$codLoc, $ubicacionStr]);
                    $locId = $pdo->lastInsertId();
                    $existingLocs[] = ['id' => $locId, 'nombre' => $ubicacionStr];
                }
            }

            // Determinación de prefijo de la categoría seleccionada
            $prefix = 'ITM';
            foreach ($existingCats as $cat) {
                if ($cat['id'] == $catId) {
                    $prefix = !empty($cat['prefijo']) ? strtoupper(trim($cat['prefijo'])) : 'ITM';
                    break;
                }
            }

            // 5. Buscar o crear Ítem de catálogo
            $itemId = null;
            $stmtFindItem = $pdo->prepare("SELECT id FROM items WHERE nombre = ? AND (marca = ? OR (marca IS NULL AND ? = '')) AND (modelo = ? OR (modelo IS NULL AND ? = '')) LIMIT 1");
            $stmtFindItem->execute([$nombreArticulo, $marca, $marca, $modelo, $modelo]);
            $itemMatch = $stmtFindItem->fetch(PDO::FETCH_ASSOC);
            
            if ($itemMatch) {
                $itemId = $itemMatch['id'];
            } else {
                // Obtener códigos usados con este prefijo en items y activos
                $used = [];
                $rows = $pdo->prepare("SELECT codigo FROM items WHERE codigo LIKE ?");
                $rows->execute([$prefix . '-%']);
                foreach ($rows->fetchAll() as $r) {
                    if (preg_match('/-([0-9]+)$/', $r['codigo'], $m)) {
                        $n = intval($m[1]);
                        if ($n > 0) $used[] = $n;
                    }
                }
                $rows2 = $pdo->prepare("SELECT codigo_interno FROM activos WHERE codigo_interno LIKE ?");
                $rows2->execute([$prefix . '-%']);
                foreach ($rows2->fetchAll() as $r) {
                    if (preg_match('/-([0-9]+)$/', $r['codigo_interno'], $m)) {
                        $n = intval($m[1]);
                        if ($n > 0) $used[] = $n;
                    }
                }

                $next_num = 1;
                while (in_array($next_num, $used)) {
                    $next_num++;
                }

                $codItem = $prefix . '-' . str_pad($next_num, 4, '0', STR_PAD_LEFT);

                $stmtNewItem = $pdo->prepare("INSERT INTO items (codigo, nombre, marca, modelo, categoria_inventario_id, ficha_tecnica) VALUES (?, ?, ?, ?, ?, ?)");
                $stmtNewItem->execute([$codItem, $nombreArticulo, $marca ?: null, $modelo ?: null, $catId, $descripcion ?: null]);
                $itemId = $pdo->lastInsertId();
                $stats['items_creados']++;
            }

            // 6. Manejo de Stock vs Unidades Físicas (Activos)
            // Insumo + Mobiliario → movimiento Entrada (para que stock_actual lo contabilice) + stock_ubicaciones
            // Equipo / Activo    → Registros físicos individuales en la tabla activos
            if ($tipo == 'insumo' || $tipo == 'mobiliario') {
                if ($stock > 0) {
                    // Verificar si ya hay movimientos de inventario inicial para este ítem (evitar duplicar en re-importación)
                    $stmtChkMov = $pdo->prepare("SELECT COUNT(*) FROM movimientos WHERE item_id = ? AND (observacion = 'Importado desde Excel' OR observacion LIKE 'Inventario inicial%')");
                    $stmtChkMov->execute([$itemId]);
                    $existingMovs = (int)$stmtChkMov->fetchColumn();

                    if ($existingMovs === 0) {
                        // Registrar movimiento de Entrada
                        $observacionMov = $locId
                            ? "Inventario inicial \u2014 encontrado en: {$ubicacionStr}"
                            : 'Importado desde Excel';
                        $stmtMov = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', ?, ?, ?)");
                        $stmtMov->execute([$itemId, $stock, $locId ?: null, $observacionMov]);
                        $stats['stock_actualizado']++;

                        // Si tiene ubicación: crear Salida para que el stock disponible = 0
                        // (el stock está desplegado en ese lugar, no disponible en bodega)
                        if ($locId) {
                            $stmtSalida = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Salida', ?, ?, ?)");
                            $stmtSalida->execute([$itemId, $stock, $locId, "Inventario inicial — asignado a: {$ubicacionStr}"]);
                        }

                        // Registrar traslado de inventario inicial (punto de partida histórico)
                        if ($locId) {
                            $stmtTrasInv = $pdo->prepare(
                                "INSERT INTO traslados (item_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, fecha, motivo, observaciones, tipo) "
                              . "VALUES (?, NULL, ?, ?, ?, 'Inventario Inicial', 'Ítem encontrado en esta ubicación al momento del levantamiento de inventario', 'Inventario')"
                            );
                            $stmtTrasInv->execute([$itemId, $locId, $stock, date('Y-m-d')]);
                        }
                    }

                    // También guardar en stock_ubicaciones si hay ubicación definida
                    if ($locId) {
                        $stmtFindStock = $pdo->prepare("SELECT id FROM stock_ubicaciones WHERE item_id = ? AND ubicacion_id = ?");
                        $stmtFindStock->execute([$itemId, $locId]);
                        $stockMatch = $stmtFindStock->fetch(PDO::FETCH_ASSOC);
                        if (!$stockMatch) {
                            $stmtInsertStock = $pdo->prepare("INSERT INTO stock_ubicaciones (item_id, ubicacion_id, cantidad) VALUES (?, ?, ?)");
                            $stmtInsertStock->execute([$itemId, $locId, $stock]);
                        }
                    }
                }
            } else {
                // Equipo / Activo: Creación de unidades individuales en tabla activos
                $rowsAct = $pdo->prepare("SELECT codigo_interno FROM activos WHERE codigo_interno LIKE ?");
                $rowsAct->execute([$prefix . '-%']);
                $dataActs = $rowsAct->fetchAll();

                $usedActs = [];
                foreach ($dataActs as $r) {
                    if (preg_match('/-([0-9]+)$/', $r['codigo_interno'], $m)) {
                        $n = intval($m[1]);
                        if ($n > 0) $usedActs[] = $n;
                    }
                }

                $next_num_act = 1;
                $qtyToInsert = !empty($nroSerie) ? 1 : (($stock > 0) ? $stock : 1);

                // Para activos sin serie: contar cuántos ya existen para este ítem y no duplicar
                if (empty($nroSerie)) {
                    $stmtCountExisting = $pdo->prepare("SELECT COUNT(*) FROM activos WHERE item_id = ? AND numero_serie IS NULL");
                    $stmtCountExisting->execute([$itemId]);
                    $existingNullSer = (int)$stmtCountExisting->fetchColumn();
                    $qtyToInsert = max(0, $qtyToInsert - $existingNullSer);
                }

                for ($i = 0; $i < $qtyToInsert; $i++) {
                    while (in_array($next_num_act, $usedActs)) {
                        $next_num_act++;
                    }

                    $codInt = $prefix . '-' . str_pad($next_num_act, 4, '0', STR_PAD_LEFT);
                    $usedActs[] = $next_num_act;

                    $serie = (!empty($nroSerie) && $i == 0) ? $nroSerie : null;

                    if ($serie) {
                        $chkSer = $pdo->prepare("SELECT id FROM activos WHERE numero_serie = ?");
                        $chkSer->execute([$serie]);
                        $existingActivo = $chkSer->fetch();
                        if ($existingActivo) {
                            // Ya existe: actualizar estado y ubicación en lugar de duplicar
                            $stmtUpd = $pdo->prepare("UPDATE activos SET estado = ?, ubicacion_id = COALESCE(?, ubicacion_id) WHERE id = ?");
                            $stmtUpd->execute([$estadoDb, $locId, $existingActivo['id']]);
                            continue; // No crear nuevo, ya actualizamos
                        }
                    }

                    $stmtActivo = $pdo->prepare("INSERT INTO activos (numero_serie, item_id, ubicacion_id, estado, codigo_interno) VALUES (?, ?, ?, ?, ?)");
                    $stmtActivo->execute([$serie, $itemId, $locId, $estadoDb, $codInt]);
                    $nuevoActivoId = $pdo->lastInsertId();

                    // Crear movimiento de Entrada con observación descriptiva
                    $observacionMovAct = $locId
                        ? "Inventario inicial \u2014 encontrado en: {$ubicacionStr}"
                        : 'Importado desde Excel';
                    $stmtMovAct = $pdo->prepare("INSERT INTO movimientos (item_id, tipo, cantidad, ubicacion_id, observacion) VALUES (?, 'Entrada', 1, ?, ?)");
                    $stmtMovAct->execute([$itemId, $locId ?: null, $observacionMovAct]);

                    // Registrar traslado de inventario inicial (punto de partida histórico)
                    if ($locId) {
                        $stmtTrasInv = $pdo->prepare(
                            "INSERT INTO traslados (item_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, fecha, motivo, observaciones, tipo) "
                          . "VALUES (?, NULL, ?, 1, ?, 'Inventario Inicial', 'Activo encontrado en esta ubicación al momento del levantamiento de inventario', 'Inventario')"
                        );
                        $stmtTrasInv->execute([$itemId, $locId, date('Y-m-d')]);
                    }

                    $stats['activos_creados']++;
                }
            }

        } catch (Exception $e) {
            $stats['errores'][] = "Error en fila $rowNum: " . $e->getMessage();
        }
    }

    $pdo->commit();
    ob_clean();
    echo json_encode(['success' => true, 'stats' => $stats]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
