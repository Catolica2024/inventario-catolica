<?php
require_once __DIR__ . '/../includes/db.php';
try {
    $pdo = db();
    // Registrar una laptop de prueba para el ítem ID 4 (Laptop)
    $stmt = $pdo->prepare("INSERT INTO activos (numero_serie, codigo_interno, item_id, estado) VALUES (?,?,?,?)");
    $stmt->execute(['SN-PRUEBA-001', 'S-LAP-0001', 4, 'Operativo']);
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
