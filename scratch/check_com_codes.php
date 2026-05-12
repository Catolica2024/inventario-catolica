<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

echo "=== ITEMS con prefijo COM ===\n";
$rows = $pdo->query("SELECT id, codigo, nombre FROM items WHERE codigo LIKE 'COM-%'")->fetchAll();
if (!$rows) echo "(ninguno)\n";
foreach ($rows as $r) echo "  items.id={$r['id']} | codigo={$r['codigo']} | nombre={$r['nombre']}\n";

echo "\n=== ACTIVOS vinculados a esos items ===\n";
$rows2 = $pdo->query("
    SELECT a.id, a.numero_serie, a.estado, i.codigo, i.nombre
    FROM activos a
    JOIN items i ON i.id = a.item_id
    WHERE i.codigo LIKE 'COM-%'
")->fetchAll();
if (!$rows2) echo "(ninguno)\n";
foreach ($rows2 as $r) echo "  activos.id={$r['id']} | serie={$r['numero_serie']} | item={$r['codigo']} | nombre={$r['nombre']}\n";

echo "\nDiagnóstico completo.\n";
