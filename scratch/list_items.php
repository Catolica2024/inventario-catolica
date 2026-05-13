<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$items = $pdo->query("SELECT id, codigo, nombre, categoria_inventario_id FROM items")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($items, JSON_PRETTY_PRINT);
