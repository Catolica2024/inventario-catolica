<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$items = $pdo->query("
    SELECT i.id, i.nombre, c.nombre as cat_nombre, c.tipo as cat_tipo 
    FROM items i 
    LEFT JOIN categorias_inventario c ON i.categoria_inventario_id = c.id
")->fetchAll();
echo json_encode($items, JSON_PRETTY_PRINT);
