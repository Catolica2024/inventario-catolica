<?php
// api/users.php — CRUD de usuarios del sistema
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $filterId = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if ($filterId) {
                // Consulta eficiente de un solo usuario (para sincronización de permisos)
                $stmt = $pdo->prepare("
                    SELECT u.id, u.nombre, u.email, u.estado, u.created_at, u.personal_id, u.permisos,
                           r.nombre as rol_nombre, r.id as rol_id,
                           p.nombre as personal_nombre
                    FROM usuarios u
                    JOIN roles r ON u.rol_id = r.id
                    LEFT JOIN personal p ON u.personal_id = p.id
                    WHERE u.id = ?
                ");
                $stmt->execute([$filterId]);
                $rows = $stmt->fetchAll();
            } else {
                $rows = $pdo->query("
                    SELECT u.id, u.nombre, u.email, u.estado, u.created_at, u.personal_id, u.permisos,
                           r.nombre as rol_nombre, r.id as rol_id,
                           p.nombre as personal_nombre
                    FROM usuarios u
                    JOIN roles r ON u.rol_id = r.id
                    LEFT JOIN personal p ON u.personal_id = p.id
                    ORDER BY u.nombre ASC
                ")->fetchAll();
            }
            $roles = $pdo->query("SELECT * FROM roles ORDER BY nombre")->fetchAll();
            $staff = $pdo->query("SELECT id, nombre, cargo FROM personal WHERE estado = 'activo' ORDER BY nombre")->fetchAll();
            json_response(['users' => $rows, 'roles' => $roles, 'staff' => $staff]);
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
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash, personal_id, rol_id, permisos, estado) VALUES (?,?,?,?,?,?,?)");
            $stmt->execute([
                $b['nombre'], 
                $b['email'], 
                $hash, 
                $b['personal_id'] ?: null, 
                $b['rol_id'], 
                $b['permisos'] ?? null,
                $b['estado'] ?? 'activo'
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            if (!empty($b['password'])) {
                // Actualizar con nueva contraseña
                $hash = password_hash($b['password'], PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, password_hash=?, personal_id=?, rol_id=?, permisos=?, estado=? WHERE id=?");
                $stmt->execute([
                    $b['nombre'], 
                    $b['email'], 
                    $hash, 
                    $b['personal_id'] ?: null, 
                    $b['rol_id'], 
                    $b['permisos'] ?? null,
                    $b['estado'], 
                    $b['id']
                ]);
            } else {
                // Actualizar sin cambiar contraseña
                $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, personal_id=?, rol_id=?, permisos=?, estado=? WHERE id=?");
                $stmt->execute([
                    $b['nombre'], 
                    $b['email'], 
                    $b['personal_id'] ?: null, 
                    $b['rol_id'], 
                    $b['permisos'] ?? null,
                    $b['estado'], 
                    $b['id']
                ]);
            }
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $pdo->prepare("DELETE FROM usuarios WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        case 'PATCH':
            // Soporta dos modos:
            // 1. toggle_module + value: activa/desactiva un módulo individual
            // 2. permisos (string): reemplaza todos los permisos de golpe
            $b = get_body();
            $id            = $b['id'] ?? null;
            $toggle_module = $b['toggle_module'] ?? null;
            $value         = $b['value'] ?? false;

            if (!$id) {
                json_response(['error' => 'Falta parámetro: id es requerido'], 400);
            }

            // Verificar que el usuario existe
            $stmt = $pdo->prepare("SELECT permisos FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['error' => 'Usuario no encontrado'], 404);

            // MODO 1: reemplazo completo de permisos (desde modal de gestión masiva)
            if (array_key_exists('permisos', $b) && $toggle_module === null) {
                $newPerms = isset($b['permisos']) && $b['permisos'] !== '' ? trim($b['permisos']) : null;
                $upd = $pdo->prepare("UPDATE usuarios SET permisos = ? WHERE id = ?");
                $upd->execute([$newPerms, $id]);
                json_response(['ok' => true, 'permisos' => $newPerms]);
                break;
            }

            // MODO 2: toggle individual de un módulo
            if (!$toggle_module) {
                json_response(['error' => 'Falta parámetro: toggle_module es requerido'], 400);
            }

            $perms = array_filter(
                array_map('trim', explode(',', $row['permisos'] ?? '')),
                fn($p) => $p !== ''
            );

            if ($value) {
                if (!in_array($toggle_module, $perms)) {
                    $perms[] = $toggle_module;
                }
            } else {
                $perms = array_filter($perms, fn($p) => $p !== $toggle_module);
            }

            $newPerms = count($perms) > 0 ? implode(',', array_values($perms)) : null;
            $upd = $pdo->prepare("UPDATE usuarios SET permisos = ? WHERE id = ?");
            $upd->execute([$newPerms, $id]);
            json_response(['ok' => true, 'permisos' => $newPerms]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
