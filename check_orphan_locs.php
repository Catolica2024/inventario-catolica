<?php
require_once 'includes/db.php';
$pdo = db();
$res = $pdo->query("SELECT id, nombre, sede_id FROM ubicaciones WHERE sede_id IS NULL")->fetchAll();
print_r($res);
