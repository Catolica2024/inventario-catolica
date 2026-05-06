<?php
// api/users.php — CRUD de usuarios del sistema
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("
                SELECT u.id, u.nombre, u.email, u.estado, u.created_at, r.nombre as rol_nombre, r.id as rol_id
                FROM usuarios u
                JOIN roles r ON u.rol_id = r.id
                ORDER BY u.nombre ASC
            ")->fetchAll();
            $roles = $pdo->query("SELECT * FROM roles ORDER BY nombre")->fetchAll();
            json_response(['users' => $rows, 'roles' => $roles]);
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['email']) || empty($b['password']) || empty($b['rol_id'])) {
                json_response(['error' => 'Email, contraseña y rol son obligatorios'], 400);
            }
            // Verificar que el email no exista
            $exists = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
            $exists->execute([$b['email']]);
            if ($exists->fetch()) json_response(['error' => 'El email ya está registrado'], 409);

            $hash = password_hash($b['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash, rol_id, estado) VALUES (?,?,?,?,?)");
            $stmt->execute([$b['nombre'], $b['email'], $hash, $b['rol_id'], $b['estado'] ?? 'activo']);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            if (!empty($b['password'])) {
                // Actualizar con nueva contraseña
                $hash = password_hash($b['password'], PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, password_hash=?, rol_id=?, estado=? WHERE id=?");
                $stmt->execute([$b['nombre'], $b['email'], $hash, $b['rol_id'], $b['estado'], $b['id']]);
            } else {
                // Actualizar sin cambiar contraseña
                $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, rol_id=?, estado=? WHERE id=?");
                $stmt->execute([$b['nombre'], $b['email'], $b['rol_id'], $b['estado'], $b['id']]);
            }
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $pdo->prepare("DELETE FROM usuarios WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
