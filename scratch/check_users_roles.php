<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
$users = $pdo->query("SELECT u.nombre, r.nombre as role FROM usuarios u JOIN roles r ON u.rol_id = r.id")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($users, JSON_PRETTY_PRINT);
