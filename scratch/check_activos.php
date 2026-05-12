<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$activos = $pdo->query("SELECT a.id, a.numero_serie, i.nombre as item_nombre FROM activos a JOIN items i ON a.item_id = i.id")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($activos, JSON_PRETTY_PRINT);
