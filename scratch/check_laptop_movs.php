<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$movs = $pdo->query("SELECT * FROM movimientos WHERE item_id = 4")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($movs, JSON_PRETTY_PRINT);
