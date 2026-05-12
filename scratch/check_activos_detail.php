<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

echo "=== ACTIVOS en BD ===\n";
$rows = $pdo->query("
    SELECT a.id, a.numero_serie, a.codigo_interno, a.ubicacion_id, a.personal_id, a.estado,
           i.nombre as item_nombre, i.codigo as item_codigo,
           u.nombre as ubicacion_nombre, s.nombre as sede_nombre
    FROM activos a
    JOIN items i ON a.item_id = i.id
    LEFT JOIN ubicaciones u ON a.ubicacion_id = u.id
    LEFT JOIN sedes s ON u.sede_id = s.id
    ORDER BY a.id DESC
")->fetchAll();

foreach ($rows as $r) {
    echo "  activo.id={$r['id']}\n";
    echo "    nombre:       {$r['item_nombre']}\n";
    echo "    codigo_int:   " . ($r['codigo_interno'] ?? 'NULL') . "\n";
    echo "    ubicacion_id: " . ($r['ubicacion_id'] ?? 'NULL') . " ({$r['ubicacion_nombre']})\n";
    echo "    sede:         " . ($r['sede_nombre'] ?? 'NULL') . "\n";
    echo "    serie:        {$r['numero_serie']}\n\n";
}
