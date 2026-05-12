<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
echo "--- ULTIMOS MOVIMIENTOS ---\n";
$res = $pdo->query("SELECT m.*, i.nombre as item FROM movimientos m JOIN items i ON m.item_id = i.id ORDER BY m.id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($res);

echo "\n--- STOCK CALCULADO EN ITEMS ---\n";
$res2 = $pdo->query("SELECT i.nombre, 
    (SELECT SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END) FROM movimientos m WHERE m.item_id = i.id) as stock
    FROM items i LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($res2);
