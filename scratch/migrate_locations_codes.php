<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // Obtener sedes
    $sedes = $pdo->query("SELECT id, codigo FROM sedes")->fetchAll();
    
    foreach ($sedes as $s) {
        $sedeId = $s['id'];
        $sedeCode = $s['codigo'] ?: 'S';
        
        $locs = $pdo->prepare("SELECT id FROM ubicaciones WHERE sede_id = ? ORDER BY id ASC");
        $locs->execute([$sedeId]);
        $rows = $locs->fetchAll();
        
        $i = 1;
        foreach ($rows as $r) {
            $newCode = $sedeCode . '-ESP-' . str_pad($i, 4, '0', STR_PAD_LEFT);
            $pdo->prepare("UPDATE ubicaciones SET codigo = ? WHERE id = ?")->execute([$newCode, $r['id']]);
            $i++;
        }
        echo "Sede $sedeCode: " . ($i - 1) . " ubicaciones actualizadas.\n";
    }
    
    // Ubicaciones sin sede
    $locsSinSede = $pdo->query("SELECT id FROM ubicaciones WHERE sede_id IS NULL OR sede_id = 0 ORDER BY id ASC")->fetchAll();
    $i = 1;
    foreach ($locsSinSede as $r) {
        $newCode = 'S-ESP-' . str_pad($i, 4, '0', STR_PAD_LEFT);
        $pdo->prepare("UPDATE ubicaciones SET codigo = ? WHERE id = ?")->execute([$newCode, $r['id']]);
        $i++;
    }
    if (count($locsSinSede) > 0) echo "Sin Sede: " . count($locsSinSede) . " ubicaciones actualizadas.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
