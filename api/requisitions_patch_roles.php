<?php
// api/requisitions_patch_roles.php — Inserta el rol req_pedagogia y actualiza el usuario semilla de Psicologia
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $logs = [];

    // 1. Insertar el rol req_pedagogia si no existe
    $rolCheck = $pdo->prepare("SELECT id FROM roles WHERE nombre = ?");
    $rolCheck->execute(['req_pedagogia']);
    $rolPedagogiaId = $rolCheck->fetchColumn();

    if (!$rolPedagogiaId) {
        $pdo->exec("INSERT INTO roles (nombre, descripcion, can_delete) VALUES ('req_pedagogia', 'Jefe Pedagogía (Sub-área): Requiere firma de Dirección', 0)");
        $rolPedagogiaId = $pdo->lastInsertId();
        $logs[] = "✅ Rol 'req_pedagogia' creado en BD con ID $rolPedagogiaId.";
    } else {
        $logs[] = "ℹ️ El rol 'req_pedagogia' ya existe.";
    }

    // 2. Modificar rol del usuario jpsicologia@catolica.edu.pe a req_pedagogia
    $stmt = $pdo->prepare("UPDATE usuarios SET rol_id = ? WHERE email = 'jpsicologia@catolica.edu.pe'");
    $stmt->execute([$rolPedagogiaId]);
    $logs[] = "👤 Usuario 'jpsicologia@catolica.edu.pe' actualizado al rol 'req_pedagogia'.";

    echo json_encode([
        'ok' => true,
        'mensaje' => 'Parche de roles y usuarios aplicado correctamente.',
        'logs' => $logs
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
