<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
echo "--- REGISTROS EN MANTENIMIENTOS ---\n";
$res = $pdo->query("SELECT * FROM mantenimientos")->fetchAll(PDO::FETCH_ASSOC);
print_r($res);
