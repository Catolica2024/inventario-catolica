<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    // Añadir columna codigo si no existe
    $pdo->exec("ALTER TABLE personal ADD COLUMN codigo VARCHAR(20) UNIQUE AFTER id");
    
    // Generar códigos para el personal existente si lo hay
    $stmt = $pdo->query("SELECT id FROM personal ORDER BY id ASC");
    $all = $stmt->fetchAll();
    foreach($all as $index => $p) {
        $newCode = 'PER-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT);
        $pdo->prepare("UPDATE personal SET codigo = ? WHERE id = ?")->execute([$newCode, $p['id']]);
    }
    
    echo json_encode(['ok' => true, 'message' => 'Columna codigo añadida y poblada en tabla personal']);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
