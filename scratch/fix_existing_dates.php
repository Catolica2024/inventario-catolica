<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // Actualizar órdenes con aprobación de gerente existente
    $stmt1 = $pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion_gerente = created_at WHERE aprobado_gerente = 1 AND fecha_aprobacion_gerente IS NULL");
    echo "Se actualizaron $stmt1 registros de Gerencia con la fecha de creación como fallback.\n";
    
    // Actualizar órdenes con aprobación de finanzas existente
    $stmt2 = $pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion_finanzas = created_at WHERE aprobado_finanzas = 1 AND fecha_aprobacion_finanzas IS NULL");
    echo "Se actualizaron $stmt2 registros de Finanzas con la fecha de creación como fallback.\n";
    
    // Actualizar órdenes con aprobación total existente
    $stmt3 = $pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion = created_at WHERE aprobado_gerente = 1 AND aprobado_finanzas = 1 AND fecha_aprobacion IS NULL");
    echo "Se actualizaron $stmt3 registros de aprobación total con la fecha de creación como fallback.\n";
    
    echo "¡Listo! Fechas de fallback configuradas en base de datos local.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
