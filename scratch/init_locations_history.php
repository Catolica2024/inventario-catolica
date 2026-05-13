<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $rows = $pdo->query("SELECT id, tipo, responsable_id FROM ubicaciones")->fetchAll();
    
    foreach ($rows as $row) {
        // Solo insertar si no tiene historial
        $check = $pdo->prepare("SELECT id FROM ubicaciones_historial WHERE ubicacion_id = ?");
        $check->execute([$row['id']]);
        if (!$check->fetch()) {
            $pdo->prepare("INSERT INTO ubicaciones_historial (ubicacion_id, tipo, responsable_id) VALUES (?,?,?)")
                ->execute([$row['id'], $row['tipo'], $row['responsable_id']]);
        }
    }
    echo "Historial inicializado para " . count($rows) . " ubicaciones.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
