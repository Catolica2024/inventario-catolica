<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$res = $pdo->query("SELECT * FROM ubicaciones")->fetchAll(PDO::FETCH_ASSOC);
print_r($res);
