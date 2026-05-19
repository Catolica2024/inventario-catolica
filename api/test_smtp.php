<?php
// api/test_smtp.php - Herramienta de Diagnóstico de QA para Conectividad SMTP
header('Content-Type: text/plain; charset=utf-8');

echo "=== DIAGNÓSTICO DE CONECTIVIDAD SMTP (GOOGLE) ===\n\n";

$tests = [
    ['host' => 'smtp.gmail.com', 'port' => 465, 'desc' => 'Puerto 465 (SSL)'],
    ['host' => 'smtp.gmail.com', 'port' => 587, 'desc' => 'Puerto 587 (TLS)']
];

foreach ($tests as $t) {
    echo "Probando conexión a {$t['host']} en el {$t['desc']}...\n";
    $start = microtime(true);
    $fp = @fsockopen($t['host'], $t['port'], $errno, $errstr, 5);
    $duration = round((microtime(true) - $start) * 1000, 2);
    
    if (!$fp) {
        echo "❌ ERROR: No se pudo conectar. Código: $errno. Detalle: $errstr (Tiempo: {$duration}ms)\n";
        echo "👉 Diagnóstico: El cortafuegos (firewall) de tu hosting tiene BLOQUEADO este puerto saliente.\n\n";
    } else {
        echo "✅ ÉXITO: ¡Conexión establecida con éxito en {$duration}ms!\n";
        echo "👉 Diagnóstico: Este puerto está abierto y disponible para usar.\n\n";
        fclose($fp);
    }
}

echo "================================================\n";
echo "Si ambos puertos salen con ❌ ERROR, significa que tu proveedor de hosting bloquea todas las conexiones SMTP externas.";
