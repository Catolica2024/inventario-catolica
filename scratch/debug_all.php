<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
echo "ITEMS:\n";
print_r($pdo->query("SELECT * FROM items")->fetchAll());
echo "\nCATEGORIES:\n";
print_r($pdo->query("SELECT * FROM categorias_inventario")->fetchAll());
