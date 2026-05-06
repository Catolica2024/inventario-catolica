<?php
// api/locations.php — CRUD de ubicaciones
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $rows = $pdo->query("SELECT codigo FROM ubicaciones WHERE codigo LIKE 'UB-%'")->fetchAll();
                $max = 0;
                foreach ($rows as $row) {
                    $n = intval(substr($row['codigo'], 3));
                    if ($n > $max) $max = $n;
                }
                $next = 'UB-' . str_pad($max + 1, 3, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $rows = $pdo->query("
                SELECT u.*, p.nombre as responsable_nombre
                FROM ubicaciones u
                LEFT JOIN personal p ON u.responsable_id = p.id
                ORDER BY u.nombre ASC
            ")->fetchAll();
            json_response(['locations' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO ubicaciones (codigo, nombre, tipo, responsable_id) VALUES (?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['responsable_id'] ?: null
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE ubicaciones SET codigo=?, nombre=?, tipo=?, responsable_id=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['responsable_id'] ?: null,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM ubicaciones WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
