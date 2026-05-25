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

    json_response([
        'kpis' => [
            'activos' => number_format($activos_totales),
            'mantenimientos' => $mantenimientos_pendientes,
            'compras' => 'S/ ' . number_format($compras_mes, 2),
            'stock_bajo' => $stock_bajo
        ],
        'distribucion' => $distribucion,
        'estados_activos' => $estados_activos,
        'recientes' => $recientes,
        'gasto_presupuesto' => [
            'dentro' => (float)$gasto_dentro,
            'fuera' => (float)$gasto_fuera,
            'total' => (float)($gasto_dentro + $gasto_fuera)
        ]
    ]);

} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
