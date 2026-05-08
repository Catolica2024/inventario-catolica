<?php
require_once __DIR__ . '/../includes/db.php';
try {
    $pdo = db();
    $pdo->exec("ALTER TABLE ordenes_compra 
        ADD COLUMN pdf_oc_url VARCHAR(500) NULL COMMENT 'Link de Google Drive del PDF de OC/OS',
        ADD COLUMN pdf_mov_url VARCHAR(500) NULL COMMENT 'Link de Google Drive del PDF de Movilidad'
    ");
    echo "Columns pdf_oc_url and pdf_mov_url added successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
