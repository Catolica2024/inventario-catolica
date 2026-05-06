<?php
// api/movements.php — Registro de movimientos de stock
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $sql = "
                SELECT m.*, i.nombre as item_nombre, p.nombre as responsable_nombre
                FROM movimientos m
                JOIN items i ON m.item_id = i.id
                LEFT JOIN personal p ON m.responsable_id = p.id
                ORDER BY m.fecha DESC
            ";
            $rows = $pdo->query($sql)->fetchAll();
            json_response(['movements' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            if (!isset($b['item_id'], $b['tipo'], $b['cantidad'])) {
                json_response(['error' => 'Datos incompletos'], 400);
            }
            
            $sql = "INSERT INTO movimientos (item_id, tipo, cantidad, responsable_id, observacion) VALUES (?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['item_id'],
                $b['tipo'],
                $b['cantidad'],
                $b['responsable_id'] ?? null,
                $b['observacion'] ?? null
            ]);
            
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
