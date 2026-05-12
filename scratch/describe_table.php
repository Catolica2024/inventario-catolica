<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$res = $pdo->query("DESCRIBE categorias_inventario")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($res, JSON_PRETTY_PRINT);
