<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

$counts = [
    'items' => $pdo->query("SELECT COUNT(*) FROM items")->fetchColumn(),
    'movimientos' => $pdo->query("SELECT COUNT(*) FROM movimientos")->fetchColumn(),
    'activos' => $pdo->query("SELECT COUNT(*) FROM activos")->fetchColumn(),
    'stock_ubicaciones' => $pdo->query("SELECT COUNT(*) FROM stock_ubicaciones")->fetchColumn(),
    'ordenes_compra_items' => $pdo->query("SELECT COUNT(*) FROM ordenes_compra_items")->fetchColumn()
];

echo json_encode($counts);
