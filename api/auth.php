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
        SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre as role 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.id 
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
            'id'    => $user['id'],
            'name'  => $user['nombre'],
            'email' => $user['email'],
            'role'  => $user['role']
        ]
    ]);

} catch (PDOException $e) {
    json_response(['error' => 'Error de base de datos: ' . $e->getMessage()], 500);
}
