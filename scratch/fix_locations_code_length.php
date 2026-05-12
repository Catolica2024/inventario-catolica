<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();
try {
    $pdo->exec("ALTER TABLE ubicaciones MODIFY codigo VARCHAR(20) UNIQUE");
    echo "OK: Columna 'codigo' ampliada a 20 caracteres y marcada como UNICA.";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
