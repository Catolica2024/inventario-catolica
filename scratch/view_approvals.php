<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $stmt = $pdo->query("SELECT id, numero_oc, aprobado_gerente, aprobado_finanzas, fecha_aprobacion_gerente, fecha_aprobacion_finanzas, fecha_aprobacion FROM ordenes_compra ORDER BY id DESC LIMIT 10");
    $rows = $stmt->fetchAll();
    
    echo "Últimas 10 órdenes:\n";
    foreach ($rows as $r) {
        printf("ID: %d | Num: %s | GG: %d (Fecha: %s) | JF: %d (Fecha: %s) | Total: %s\n",
            $r['id'],
            $r['numero_oc'],
            $r['aprobado_gerente'],
            $r['fecha_aprobacion_gerente'] ?: 'NULL',
            $r['aprobado_finanzas'],
            $r['fecha_aprobacion_finanzas'] ?: 'NULL',
            $r['fecha_aprobacion'] ?: 'NULL'
        );
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
