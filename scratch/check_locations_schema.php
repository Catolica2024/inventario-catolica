<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$stmt = $pdo->query("DESCRIBE ubicaciones");
echo json_encode($stmt->fetchAll(), JSON_PRETTY_PRINT);
