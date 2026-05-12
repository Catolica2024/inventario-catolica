<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$res = $pdo->query("DESCRIBE proveedores")->fetchAll(PDO::FETCH_ASSOC);
print_r($res);
