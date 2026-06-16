<?php
// includes/db.php — Configuración HÍBRIDA INTELIGENTE (Local/Producción)
// Corregido: Credenciales de hosting con prefijo truncado por el servidor.

$is_local = (!isset($_SERVER['SERVER_NAME']) || $_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1');

if ($is_local) {
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', '3307');
    define('DB_NAME', 'catolica_school');
    define('DB_USER', 'root');
    define('DB_PASS', '');

    // CONFIGURACIÓN SMTP LOCAL (Ej: Mailtrap o servidor mock de desarrollo)
    define('USE_NATIVE_MAIL', false);
    define('SMTP_HOST', 'sandbox.smtp.mailtrap.io');
    define('SMTP_PORT', 2525);
    define('SMTP_USER', 'tu_usuario_mailtrap');
    define('SMTP_PASS', 'tu_password_mailtrap');
    define('SMTP_SECURE', 'tls'); // 'tls' o 'ssl' o vacio
    define('SMTP_FROM_EMAIL', 'operations@colegiolacatolica.edu.pe');
    define('SMTP_FROM_NAME', 'Católica School (Local)');
} else {
    define('DB_HOST', 'localhost');
    define('DB_PORT', '3306');
    define('DB_NAME', 'lacatoli_inventario');
    define('DB_USER', 'lacatoli_admin');
    define('DB_PASS', 'V&tHqt[@x5Uv[9b{');

    // CONFIGURACIÓN CORREO PRODUCCIÓN (SMTP autenticado con correo del hosting)
    // Usamos notiweb@catolicaschool.edu.pe porque es el correo que SÍ existe en este cPanel.
    // Esto permite firma DKIM → Hotmail y Outlook reciben el correo correctamente.
    define('USE_NATIVE_MAIL', false);
    define('SMTP_HOST', 'localhost');                        // SMTP interno del cPanel
    define('SMTP_PORT', 465);                               // 465=SSL | 587=TLS
    define('SMTP_SECURE', 'ssl');                           // 'ssl' para puerto 465
    define('SMTP_USER', 'notiweb@catolicaschool.edu.pe');   // Correo que existe en el hosting
    define('SMTP_PASS', '28GJ9nG)%Ezs(}Fy');     // ← Obtener del cPanel > Administrar
    define('SMTP_FROM_EMAIL', 'notiweb@catolicaschool.edu.pe');
    define('SMTP_FROM_NAME', 'Católica School');
}

define('DB_CHARSET', 'utf8mb4');

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            error_log("Error de conexión: " . $e->getMessage());
            $is_local = ($_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1');
            $msg = $is_local ? "Error DB Local: " . $e->getMessage() : "Error de conexión al servidor de producción";
            json_response(['error' => $msg], 500);
        }
    }
    return $pdo;
}

function json_response($data, int $status = 200) {
    while (ob_get_level()) ob_end_clean();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_body() {
    $raw = file_get_contents('php://input');
    return $raw ? json_decode($raw, true) : $_POST;
}
