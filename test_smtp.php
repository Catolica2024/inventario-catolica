<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$server_ip = $_SERVER['SERVER_ADDR'] ?? 'Desconocida';
echo "<div style='background:#f4f4f4; padding:10px; margin-bottom:20px; border:1px solid #ccc;'>";
echo "<strong>IP DE ESTE SERVIDOR (Dásela a soporte):</strong> " . htmlspecialchars($server_ip) . "<br>";
echo "<strong>Dominio:</strong> " . htmlspecialchars($_SERVER['SERVER_NAME']);
echo "</div>";

function test_connection($host, $port) {
    echo "<h3>Probando conexión a $host en el puerto $port...</h3>";
    $timeout = 10;
    
    $fsock = @fsockopen($host, $port, $errno, $errstr, $timeout);
    
    if (!$fsock) {
        echo "<p style='color: red;'><strong>Fallo:</strong> No se pudo conectar al puerto $port.<br>";
        echo "Error: $errno - $errstr</p>";
        echo "<p>El hosting probablemente aún tiene bloqueado este puerto de salida.</p>";
    } else {
        echo "<p style='color: green;'><strong>¡Éxito!</strong> El puerto $port está ABIERTO y permite conexiones salientes.</p>";
        stream_set_timeout($fsock, 2);
        $res = fread($fsock, 1024);
        if ($res) {
            echo "<p>Respuesta del servidor SMTP: <code>" . htmlspecialchars($res) . "</code></p>";
        }
        fclose($fsock);
    }
    echo "<hr>";
}

echo "<h2>Prueba de Puertos SMTP (Salida)</h2>";
echo "<p>Este script verifica si tu servidor web actual puede hacer peticiones hacia servidores de correo externos en los puertos 465 y 587.</p>";

test_connection("smtp.gmail.com", 587); // TLS
test_connection("smtp.gmail.com", 465); // SSL
?>
