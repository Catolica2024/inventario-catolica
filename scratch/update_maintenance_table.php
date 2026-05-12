<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

$sql = "ALTER TABLE mantenimientos ADD COLUMN cantidad INT DEFAULT 1 AFTER item_id;";

try {
    $pdo->exec($sql);
    echo "Columna 'cantidad' añadida con éxito.\n";
} catch (Exception $e) {
    echo "Error o columna ya existe: " . $e->getMessage() . "\n";
}
