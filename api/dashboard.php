<?php
// api/dashboard.php — Estadísticas para el Dashboard
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // 1. Activos totales
    $activos_totales = $pdo->query("SELECT COUNT(*) FROM activos")->fetchColumn();
    
    // 2. Mantenimientos pendientes (Programados o En proceso)
    $mantenimientos_pendientes = $pdo->query("SELECT COUNT(*) FROM mantenimientos WHERE estado IN ('Programado', 'En proceso')")->fetchColumn();
    
    // 3. Compras del mes (Aprobadas)
    $compras_mes = $pdo->query("
        SELECT SUM(monto) 
        FROM ordenes_compra 
        WHERE estado IN ('Aprobada', 'Recibida', 'Completada') 
        AND MONTH(fecha) = MONTH(CURRENT_DATE()) 
        AND YEAR(fecha) = YEAR(CURRENT_DATE())
    ")->fetchColumn() ?: 0;
    
    // 4. Stock bajo (Comparando stock_minimo con la suma de movimientos)
    // Nota: Esta consulta es más compleja, calculamos el stock actual por ítem
    // 4. Stock bajo (Comparando el stock_minimo de la CATEGORÍA con el stock actual de cada ítem)
    $stock_bajo = $pdo->query("
        SELECT COUNT(*) FROM (
            SELECT i.id, c.stock_minimo as min_cat, (COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END), 0)) as stock_actual
            FROM items i
            JOIN categorias_inventario c ON i.categoria_inventario_id = c.id
            LEFT JOIN movimientos m ON i.id = m.item_id
            GROUP BY i.id
            HAVING stock_actual < min_cat
        ) as t
    ")->fetchColumn();

    // 5. Distribución por categorías (para el gráfico de barras)
    $distribucion = $pdo->query("
        SELECT c.nombre, COUNT(i.id) as cantidad
        FROM categorias_inventario c
        LEFT JOIN items i ON c.id = i.categoria_inventario_id
        GROUP BY c.id
        ORDER BY cantidad DESC
    ")->fetchAll();

    // 6. Mantenimientos recientes
    $recientes = $pdo->query("
        SELECT a.numero_serie, i.nombre as item_nombre, m.estado
        FROM mantenimientos m
        JOIN activos a ON m.activo_id = a.id
        JOIN items i ON a.item_id = i.id
        ORDER BY m.id DESC
        LIMIT 5
    ")->fetchAll();

    // 7. Estados de activos (para gráfico circular)
    $estados_activos = $pdo->query("
        SELECT estado, COUNT(*) as cantidad
        FROM activos
        GROUP BY estado
    ")->fetchAll();

    // 8. Gasto dentro y fuera de presupuesto (para órdenes Aprobadas, Recibidas, Completadas)
    $gasto_presupuesto = $pdo->query("
        SELECT 
            SUM(CASE WHEN dentro_presupuesto = 1 THEN total ELSE 0 END) as dentro,
            SUM(CASE WHEN dentro_presupuesto = 0 THEN total ELSE 0 END) as fuera
        FROM ordenes_compra
        WHERE estado IN ('Aprobada', 'Recibida', 'Completada')
    ")->fetch();

    $gasto_dentro = $gasto_presupuesto['dentro'] ?: 0;
    $gasto_fuera = $gasto_presupuesto['fuera'] ?: 0;

    // 9. Montos pagados y pendientes desglosados por moneda
    $pagos_por_moneda = $pdo->query("
        SELECT
            moneda,
            COALESCE(SUM(CASE WHEN pagado = 1 THEN total ELSE 0 END), 0)                                      AS pagado,
            COALESCE(SUM(CASE WHEN estado = 'Aprobada' AND pagado = 0 AND adelanto_pagado = 0 THEN total ELSE 0 END), 0) AS pendiente
        FROM ordenes_compra
        WHERE estado IN ('Aprobada', 'Recibida', 'Completada')
        GROUP BY moneda
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Indexar por moneda para fácil acceso en JS
    $pagos = ['PEN' => ['pagado' => 0, 'pendiente' => 0], 'USD' => ['pagado' => 0, 'pendiente' => 0]];
    foreach ($pagos_por_moneda as $row) {
        $m = $row['moneda'];
        if (isset($pagos[$m])) {
            $pagos[$m]['pagado']    = (float)$row['pagado'];
            $pagos[$m]['pendiente'] = (float)$row['pendiente'];
        }
    }

    // Totales globales (sumados, para compatibilidad)
    $monto_pagado             = $pagos['PEN']['pagado']    + $pagos['USD']['pagado'];
    $monto_pendiente_aprobado = $pagos['PEN']['pendiente'] + $pagos['USD']['pendiente'];

    // 10. Gasto por área (solo OC/OS aprobadas, recibidas o completadas)
    //     Incluye desglose de sub-áreas bajo Pedagogía (parent_area_id = id de Pedagogía)
    $gasto_por_area_raw = $pdo->query("
        SELECT 
            COALESCE(a_parent.nombre, a.nombre) AS grupo,
            a.nombre AS area_nombre,
            a.parent_area_id,
            SUM(oc.total) AS total_gasto,
            COUNT(oc.id) AS num_ordenes
        FROM ordenes_compra oc
        LEFT JOIN areas a ON oc.area_id = a.id
        LEFT JOIN areas a_parent ON a.parent_area_id = a_parent.id
        WHERE oc.estado IN ('Aprobada', 'Recibida', 'Completada')
          AND oc.estado NOT LIKE 'Req_%'
          AND oc.area_id IS NOT NULL
        GROUP BY a.id
        ORDER BY total_gasto DESC
    ")->fetchAll();

    // Agrupar: primero consolidar totales por grupo (área raíz) y guardar sub-áreas separadas
    $grupos = [];
    foreach ($gasto_por_area_raw as $row) {
        $grupo = $row['grupo'];
        if (!isset($grupos[$grupo])) {
            $grupos[$grupo] = ['nombre' => $grupo, 'total' => 0, 'ordenes' => 0, 'sub_areas' => []];
        }
        $grupos[$grupo]['total']   += (float)$row['total_gasto'];
        $grupos[$grupo]['ordenes'] += (int)$row['num_ordenes'];
        // Si es una sub-área (tiene parent), registrar el desglose
        if ($row['parent_area_id']) {
            $grupos[$grupo]['sub_areas'][] = [
                'nombre'  => $row['area_nombre'],
                'total'   => (float)$row['total_gasto'],
                'ordenes' => (int)$row['num_ordenes'],
            ];
        }
    }

    // Ordenar grupos por total descendente
    usort($grupos, fn($a, $b) => $b['total'] <=> $a['total']);
    $gasto_por_area = array_values($grupos);

    json_response([
        'kpis' => [
            'activos'        => number_format($activos_totales),
            'mantenimientos' => $mantenimientos_pendientes,
            'compras'        => 'S/ ' . number_format($compras_mes, 2),
            'stock_bajo'     => $stock_bajo
        ],
        'distribucion'      => $distribucion,
        'estados_activos'   => $estados_activos,
        'recientes'         => $recientes,
        'gasto_presupuesto' => [
            'dentro' => (float)$gasto_dentro,
            'fuera'  => (float)$gasto_fuera,
            'total'  => (float)($gasto_dentro + $gasto_fuera)
        ],
        'pagos' => [
            'monto_pagado'             => $monto_pagado,
            'monto_pendiente_aprobado' => $monto_pendiente_aprobado,
            'por_moneda'               => $pagos
        ],
        'gasto_por_area' => $gasto_por_area,
    ]);

} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
