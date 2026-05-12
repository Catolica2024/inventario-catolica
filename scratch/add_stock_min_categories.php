<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
try {
    $pdo->exec("ALTER TABLE categorias_inventario ADD COLUMN stock_minimo INT DEFAULT 5 AFTER tipo");
    echo "OK: Columna stock_minimo añadida con éxito.";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "OK: La columna ya existe.";
    } else {
        echo "ERROR: " . $e->getMessage();
    }
}
