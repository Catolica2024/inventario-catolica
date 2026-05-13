<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // Añadir personal_id y permisos
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN personal_id INT NULL AFTER password_hash");
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN permisos TEXT NULL AFTER rol_id");
    
    // Añadir FK
    $pdo->exec("ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE SET NULL");

    echo "Tabla 'usuarios' actualizada con personal_id y permisos.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
