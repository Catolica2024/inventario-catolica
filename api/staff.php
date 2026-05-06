<?php
// api/staff.php — CRUD de personal
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("SELECT * FROM personal ORDER BY nombre ASC")->fetchAll();
            json_response(['staff' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['nombre'])) json_response(['error' => 'Nombre es obligatorio'], 400);
            $stmt = $pdo->prepare("INSERT INTO personal (dni, nombre, cargo, area, telefono) VALUES (?,?,?,?,?)");
            $stmt->execute([$b['dni'] ?? null, $b['nombre'], $b['cargo'] ?? null, $b['area'] ?? null, $b['telefono'] ?? null]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $stmt = $pdo->prepare("UPDATE personal SET dni=?, nombre=?, cargo=?, area=?, telefono=? WHERE id=?");
            $stmt->execute([$b['dni'] ?? null, $b['nombre'], $b['cargo'] ?? null, $b['area'] ?? null, $b['telefono'] ?? null, $b['id']]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $pdo->prepare("DELETE FROM personal WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
