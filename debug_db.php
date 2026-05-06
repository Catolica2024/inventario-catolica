<?php
// debug_db.php — Script para diagnosticar problemas de conexión y datos
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/plain; charset=utf-8');

echo "--- DIAGNÓSTICO DE BASE DE DATOS ---\n\n";

try {
    echo "1. Probando conexión a la base de datos...\n";
    $pdo = db();
    echo "   [OK] Conexión establecida exitosamente.\n\n";

    echo "2. Verificando si existe la tabla 'usuarios'...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'usuarios'");
    if ($stmt->rowCount() > 0) {
        echo "   [OK] La tabla 'usuarios' existe.\n\n";
    } else {
        echo "   [ERROR] La tabla 'usuarios' NO existe. ¿Importaste el schema.sql?\n\n";
    }

    echo "3. Verificando contenido de la tabla 'usuarios'...\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM usuarios");
    $count = $stmt->fetchColumn();
    echo "   [INFO] Hay $count usuarios registrados.\n\n";

    if ($count > 0) {
        echo "4. Detalle de usuarios (sin passwords):\n";
        $stmt = $pdo->query("SELECT id, nombre, email, rol_id, estado FROM usuarios");
        while ($row = $stmt->fetch()) {
            echo "   - ID: {$row['id']} | Email: {$row['email']} | Rol ID: {$row['rol_id']} | Estado: {$row['estado']}\n";
        }
    } else {
        echo "   [ADVERTENCIA] No hay usuarios en la tabla. El login nunca funcionará así.\n";
    }

} catch (Exception $e) {
    echo "   [ERROR CRÍTICO] " . $e->getMessage() . "\n";
}
