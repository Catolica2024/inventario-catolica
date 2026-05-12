<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$res = $pdo->query("DESCRIBE mantenimientos")->fetchAll(PDO::FETCH_ASSOC);
print_r($res);
