<?php
require_once 'includes/db.php';
try {
    $pdo = db();
    
    echo "--- RECODIFICANDO UBICACIONES ---\n";
    $locs = $pdo->query("SELECT u.*, s.codigo as sede_code FROM ubicaciones u JOIN sedes s ON u.sede_id = s.id")->fetchAll();
    $counters = [];
    foreach($locs as $l) {
        $typeCode = strtoupper(substr($l['tipo'] ?? 'O', 0, 1));
        $prefix = $l['sede_code'] . $typeCode;
        if (!isset($counters[$prefix])) $counters[$prefix] = 1;
        $newCode = $prefix . '-' . str_pad($counters[$prefix]++, 4, '0', STR_PAD_LEFT);
        $pdo->prepare("UPDATE ubicaciones SET codigo = ? WHERE id = ?")->execute([$newCode, $l['id']]);
        echo "ID {$l['id']}: {$l['codigo']} -> $newCode\n";
    }

    echo "\n--- RECODIFICANDO ÍTEMS ---\n";
    $items = $pdo->query("SELECT i.*, c.prefijo FROM items i JOIN categorias_inventario c ON i.categoria_inventario_id = c.id")->fetchAll();
    $counters = [];
    foreach($items as $i) {
        $prefix = $i['prefijo'] ?: 'GEN';
        if (!isset($counters[$prefix])) $counters[$prefix] = 1;
        $newCode = $prefix . '-' . str_pad($counters[$prefix]++, 4, '0', STR_PAD_LEFT);
        $pdo->prepare("UPDATE items SET codigo = ? WHERE id = ?")->execute([$newCode, $i['id']]);
        echo "ID {$i['id']}: {$i['codigo']} -> $newCode\n";
    }

    echo "\n--- RECODIFICANDO ACTIVOS ---\n";
    $activos = $pdo->query("
        SELECT a.*, i.categoria_inventario_id, ci.prefijo, s.codigo as sede_code 
        FROM activos a 
        JOIN items i ON a.item_id = i.id 
        JOIN categorias_inventario ci ON i.categoria_inventario_id = ci.id
        JOIN ubicaciones u ON a.ubicacion_id = u.id
        JOIN sedes s ON u.sede_id = s.id
    ")->fetchAll();
    $counters = [];
    foreach($activos as $a) {
        $prefix = $a['sede_code'] . ($a['prefijo'] ?: 'GEN');
        if (!isset($counters[$prefix])) $counters[$prefix] = 1;
        $newCode = $prefix . '-' . str_pad($counters[$prefix]++, 4, '0', STR_PAD_LEFT);
        $pdo->prepare("UPDATE activos SET codigo_interno = ? WHERE id = ?")->execute([$newCode, $a['id']]);
        echo "ID {$a['id']}: {$a['codigo_interno']} -> $newCode\n";
    }

    echo "\n--- PROCESO COMPLETADO ---";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
