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
        WHERE estado = 'Aprobada' 
        AND MONTH(fecha) = MONTH(CURRENT_DATE()) 
        AND YEAR(fecha) = YEAR(CURRENT_DATE())
    ")->fetchColumn() ?: 0;
    
    // 4. Stock bajo (Comparando stock_minimo con la suma de movimientos)
    // Nota: Esta consulta es más compleja, calculamos el stock actual por ítem
    $stock_bajo = $pdo->query("
        SELECT COUNT(*) FROM (
            SELECT i.id, i.stock_minimo, (COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END), 0)) as stock_actual
            FROM items i
            LEFT JOIN movimientos m ON i.id = m.item_id
            GROUP BY i.id
            HAVING stock_actual < i.stock_minimo
        ) as t
    ")->fetchColumn();

    // 5. Distribución por categorías (para el gráfico de barras)
    $distribucion = $pdo->query("
        SELECT c.nombre, COUNT(i.id) as cantidad
        FROM categorias c
        LEFT JOIN items i ON c.id = i.categoria_id
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

    json_response([
        'kpis' => [
            'activos' => number_format($activos_totales),
            'mantenimientos' => $mantenimientos_pendientes,
            'compras' => 'S/ ' . number_format($compras_mes, 2),
            'stock_bajo' => $stock_bajo
        ],
        'distribucion' => $distribucion,
        'recientes' => $recientes
    ]);

} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
