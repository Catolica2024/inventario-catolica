<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

echo "=== ITEMS en BD ===\n";
$rows = $pdo->query("SELECT id, codigo, nombre, categoria_inventario_id FROM items ORDER BY id DESC")->fetchAll();
if (!$rows) echo "(ninguno)\n";
foreach ($rows as $r) echo "  id={$r['id']} | codigo={$r['codigo']} | nombre={$r['nombre']}\n";

echo "\n=== MOVIMIENTOS en BD ===\n";
$movs = $pdo->query("
    SELECT m.id, m.item_id, m.tipo, m.cantidad, m.observacion, u.nombre as ubicacion
    FROM movimientos m
    LEFT JOIN ubicaciones u ON u.id = m.ubicacion_id
    ORDER BY m.id DESC LIMIT 20
")->fetchAll();
if (!$movs) echo "(ninguno)\n";
foreach ($movs as $r) echo "  mov.id={$r['id']} | item_id={$r['item_id']} | tipo={$r['tipo']} | cantidad={$r['cantidad']} | ubicacion={$r['ubicacion']} | obs={$r['observacion']}\n";

echo "\n=== ACTIVOS en BD ===\n";
$acts = $pdo->query("
    SELECT a.id, a.item_id, a.numero_serie, a.estado, i.nombre as item_nombre
    FROM activos a
    LEFT JOIN items i ON i.id = a.item_id
    ORDER BY a.id DESC LIMIT 20
")->fetchAll();
if (!$acts) echo "(ninguno)\n";
foreach ($acts as $r) echo "  activo.id={$r['id']} | item_id={$r['item_id']} | serie={$r['numero_serie']} | estado={$r['estado']} | item={$r['item_nombre']}\n";
