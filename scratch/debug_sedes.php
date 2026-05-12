<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
echo "SEDES:\n";
print_r($pdo->query("SELECT * FROM sedes")->fetchAll());
