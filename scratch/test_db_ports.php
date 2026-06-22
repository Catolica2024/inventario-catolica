<?php
echo "Probando conexión a puerto 3306...\n";
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=catolica_school;charset=utf8mb4', 'root', '');
    echo "¡Conectado exitosamente al puerto 3306!\n";
} catch (Exception $e) {
    echo "Fallo puerto 3306: " . $e->getMessage() . "\n";
}

echo "Probando conexión a puerto 3307...\n";
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3307;dbname=catolica_school;charset=utf8mb4', 'root', '');
    echo "¡Conectado exitosamente al puerto 3307!\n";
} catch (Exception $e) {
    echo "Fallo puerto 3307: " . $e->getMessage() . "\n";
}
