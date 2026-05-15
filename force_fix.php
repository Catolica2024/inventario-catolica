<?php
/**
 * force_fix.php — Reparación forzada de contraseñas
 */
require_once __DIR__ . '/includes/db.php';

try {
    $pdo = db();
    $email = 'admin@catolica.edu';
    $password = 'admin123';
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE email = ?");
    $stmt->execute([$hash, $email]);

    echo "<h1>✅ Reparación Exitosa</h1>";
    echo "<p>Se ha actualizado el hash para <b>$email</b> correctamente.</p>";
    echo "<p>Hash generado: <code>$hash</code></p>";
    echo "<p><a href='index.html'>Volver al Login</a></p>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
