<?php
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    $usuario_id = $_GET['usuario_id'] ?? null;

    switch ($method) {
        case 'GET':
            if (!$usuario_id) json_response(['notifications' => []]);
            
            $rows = $pdo->prepare("SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 50");
            $rows->execute([$usuario_id]);
            json_response(['notifications' => $rows->fetchAll()]);
            break;

        case 'PUT':
            // Marcar como leída
            $b = get_body();
            if (isset($b['id'])) {
                $pdo->prepare("UPDATE notificaciones SET leido = 1 WHERE id = ?")->execute([$b['id']]);
            } else if ($usuario_id) {
                $pdo->prepare("UPDATE notificaciones SET leido = 1 WHERE usuario_id = ?")->execute([$usuario_id]);
            }
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if ($id) {
                $pdo->prepare("DELETE FROM notificaciones WHERE id = ?")->execute([$id]);
            }
            json_response(['ok' => true]);
            break;
    }
} catch (Exception $e) {
    json_response(['error' => $e->getMessage()], 500);
}
