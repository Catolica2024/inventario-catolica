<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

// Obtener todos los activos con codigo_interno NULL que tienen un item con código
$rows = $pdo->query("
    SELECT a.id, a.item_id, i.codigo as item_codigo, i.nombre as item_nombre
    FROM activos a
    JOIN items i ON a.item_id = i.id
    WHERE (a.codigo_interno IS NULL OR a.codigo_interno = '')
      AND i.codigo IS NOT NULL
")->fetchAll();

if (!$rows) {
    echo "OK: No hay registros con codigo_interno vacío.\n";
} else {
    $stmt = $pdo->prepare("UPDATE activos SET codigo_interno = ? WHERE id = ?");
    foreach ($rows as $r) {
        $stmt->execute([$r['item_codigo'], $r['id']]);
        echo "Reparado: activo.id={$r['id']} → codigo_interno={$r['item_codigo']} ({$r['item_nombre']})\n";
    }
    echo "\nTotal reparados: " . count($rows) . "\n";
}
