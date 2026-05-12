<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$id = 2;
$res = [
    'movimientos' => $pdo->query("SELECT COUNT(*) FROM movimientos WHERE item_id=$id")->fetchColumn(),
    'activos' => $pdo->query("SELECT COUNT(*) FROM activos WHERE item_id=$id")->fetchColumn(),
    'stock_ubicaciones' => $pdo->query("SELECT COUNT(*) FROM stock_ubicaciones WHERE item_id=$id")->fetchColumn(),
    'ordenes_compra_items' => $pdo->query("SELECT COUNT(*) FROM ordenes_compra_items WHERE item_id=$id")->fetchColumn()
];
echo json_encode($res, JSON_PRETTY_PRINT);
