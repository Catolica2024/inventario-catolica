<?php
// api/auth.php — Endpoint de autenticación real
require_once __DIR__ . '/../includes/db.php';

$body = get_body();
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if (!$email || !$password) {
    json_response(['error' => 'Correo y contraseña son requeridos'], 400);
}

try {
    $pdo = db();
    $stmt = $pdo->prepare("
        SELECT u.id, u.nombre, u.email, u.password_hash, u.permisos, u.personal_id, r.nombre as role, r.can_delete,
               COALESCE(a_jefe.id, a_pers.id) AS area_id,
               COALESCE(a_jefe.nombre, a_pers.nombre) AS area_nombre,
               COALESCE(a_jefe.parent_area_id, a_pers.parent_area_id) AS parent_area_id
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.id 
        LEFT JOIN areas a_jefe ON a_jefe.jefe_id = u.id
        LEFT JOIN personal p ON u.personal_id = p.id
        LEFT JOIN areas a_pers ON p.area_id = a_pers.id
        WHERE u.email = ? AND u.estado = 'activo'
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(['error' => 'Credenciales inválidas'], 401);
    }

    // Quitar el hash antes de enviar la respuesta
    unset($user['password_hash']);

    json_response([
        'user' => [
            'id'             => $user['id'],
            'name'           => $user['nombre'],
            'email'          => $user['email'],
            'role'           => $user['role'],
            'can_delete'     => (int)$user['can_delete'],
            'permissions'    => $user['permisos'],
            'personal_id'    => $user['personal_id'],
            'area_id'        => $user['area_id'] ? (int)$user['area_id'] : null,
            'area_nombre'    => $user['area_nombre'] ?? null,
            'parent_area_id' => $user['parent_area_id'] ? (int)$user['parent_area_id'] : null,
        ]
    ]);

} catch (PDOException $e) {
    json_response(['error' => 'Error de base de datos: ' . $e->getMessage()], 500);
}
