<?php
// api/sedes.php — CRUD de Sedes
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("SELECT * FROM sedes ORDER BY nombre ASC")->fetchAll();
            json_response(['sedes' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO sedes (codigo, nombre, distrito, provincia, direccion) VALUES (?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'],
                $b['nombre'],
                $b['distrito'] ?? null,
                $b['provincia'] ?? null,
                $b['direccion'] ?? null
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE sedes SET codigo=?, nombre=?, distrito=?, provincia=?, direccion=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'],
                $b['nombre'],
                $b['distrito'] ?? null,
                $b['provincia'] ?? null,
                $b['direccion'] ?? null,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM sedes WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
