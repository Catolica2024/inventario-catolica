<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$cats = $pdo->query("SELECT id, nombre, tipo FROM categorias_inventario")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($cats, JSON_PRETTY_PRINT);
