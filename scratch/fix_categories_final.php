<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    
    // Lista de nombres de categorías que deben ser Mobiliario
    $mobiliario = ['Sillas', 'Escritorios', 'Mesas', 'Armarios', 'Muebles'];
    // Lista de nombres que deben ser Equipos
    $equipos = ['Laptop', 'Computadoras', 'Monitores', 'Parlantes', 'Mouses', 'Microondas', 'Micrófonos', 'Tablets', 'Proyectores'];

    foreach ($mobiliario as $nom) {
        $pdo->prepare("UPDATE categorias_inventario SET tipo = 'mobiliario' WHERE nombre LIKE ?")->execute(["%$nom%"]);
    }
    
    foreach ($equipos as $nom) {
        $pdo->prepare("UPDATE categorias_inventario SET tipo = 'equipo' WHERE nombre LIKE ?")->execute(["%$nom%"]);
    }

    echo json_encode(['ok' => true, 'message' => 'Categorías reclasificadas correctamente']);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
