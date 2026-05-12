<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$roles = $pdo->query("SELECT * FROM roles")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($roles, JSON_PRETTY_PRINT);
