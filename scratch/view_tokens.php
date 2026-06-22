<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $stmt = $pdo->query("SELECT id, orden_id, rol, usado, usado_en, email_destinatario FROM ordenes_compra_tokens ORDER BY id DESC LIMIT 20");
    $rows = $stmt->fetchAll();
    
    echo "Últimos 20 tokens:\n";
    foreach ($rows as $r) {
        printf("ID: %d | Orden: %d | Rol: %s | Usado: %d | Usado En: %s | Email: %s\n",
            $r['id'],
            $r['orden_id'],
            $r['rol'],
            $r['usado'],
            $r['usado_en'] ?: 'NULL',
            $r['email_destinatario'] ?: 'NULL'
        );
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
