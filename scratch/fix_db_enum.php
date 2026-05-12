<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // 1. Cambiar el ENUM para permitir los tipos correctos
    $pdo->exec("ALTER TABLE categorias_inventario MODIFY COLUMN tipo ENUM('insumo', 'mobiliario', 'equipo', 'activo') DEFAULT 'insumo'");

    // 2. Reclasificar datos
    $mobiliario = ['Sillas', 'Escritorios', 'Mesas', 'Armarios', 'Muebles'];
    $equipos = ['Laptop', 'Computadoras', 'Monitores', 'Parlantes', 'Mouses', 'Microondas', 'Micrófonos', 'Tablets', 'Proyectores'];

    foreach ($mobiliario as $nom) {
        $pdo->prepare("UPDATE categorias_inventario SET tipo = 'mobiliario' WHERE nombre LIKE ?")->execute(["%$nom%"]);
    }
    
    foreach ($equipos as $nom) {
        $pdo->prepare("UPDATE categorias_inventario SET tipo = 'equipo' WHERE nombre LIKE ? OR tipo = 'activo'")->execute(["%$nom%"]);
    }

    echo json_encode(['ok' => true, 'message' => 'Estructura y datos corregidos exitosamente']);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
