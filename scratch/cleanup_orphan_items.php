<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

// Eliminar items huérfanos: que no tienen activos ni movimientos asociados
// y cuyo nombre está vacío o es NULL (registros incompletos)
$stmt = $pdo->query("
    SELECT i.id, i.codigo, i.nombre
    FROM items i
    LEFT JOIN activos a ON a.item_id = i.id
    LEFT JOIN movimientos m ON m.item_id = i.id
    WHERE a.id IS NULL 
      AND m.id IS NULL
      AND (i.nombre IS NULL OR TRIM(i.nombre) = '')
");
$orphans = $stmt->fetchAll();

if (!$orphans) {
    echo "No hay registros huérfanos con nombre vacío.\n";
} else {
    foreach ($orphans as $r) {
        $pdo->prepare("DELETE FROM items WHERE id = ?")->execute([$r['id']]);
        echo "Eliminado: id={$r['id']} | codigo={$r['codigo']} | nombre='{$r['nombre']}'\n";
    }
    echo "\nLimpieza completada. Total eliminados: " . count($orphans) . "\n";
}
