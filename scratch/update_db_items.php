<?php
require_once __DIR__ . '/../includes/db.php';
try {
    $pdo = db();
    $pdo->exec("ALTER TABLE ordenes_compra_items ADD COLUMN categoria_nombre VARCHAR(100) AFTER item_id, ADD COLUMN prefijo VARCHAR(10) AFTER categoria_nombre");
    echo "Columns added successfully";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
