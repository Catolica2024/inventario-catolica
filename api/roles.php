<?php
// api/roles.php — Gestión de roles y permisos dinámicos
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("SELECT * FROM roles ORDER BY nombre")->fetchAll();
            json_response(['roles' => $rows]);
            break;

        case 'PUT':
            $b = get_body();
            if (empty($b['id'])) {
                json_response(['error' => 'ID de rol es obligatorio'], 400);
            }
            
            $stmt = $pdo->prepare("UPDATE roles SET nombre = ?, descripcion = ?, can_delete = ? WHERE id = ?");
            $stmt->execute([
                $b['nombre'],
                $b['descripcion'],
                isset($b['can_delete']) ? $b['can_delete'] : 0,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
