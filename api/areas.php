<?php
// api/areas.php — CRUD de áreas (departamentos)
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $sede_id = $_GET['sede_id'] ?? 1;
                $stmtSede = $pdo->prepare("SELECT codigo FROM sedes WHERE id = ?");
                $stmtSede->execute([$sede_id]);
                $sede = $stmtSede->fetch();
                $sedeCode = ($sede && $sede['codigo']) ? $sede['codigo'] : 'C';

                $prefix = $sedeCode . '-ARE';
                $stmt = $pdo->prepare("SELECT codigo FROM areas WHERE codigo LIKE ? ORDER BY id DESC LIMIT 50");
                $stmt->execute([$prefix . '-%']);
                $data = $stmt->fetchAll();

                $max = 0;
                foreach ($data as $row) {
                    $parts = explode('-', $row['codigo']);
                    $n = intval(end($parts));
                    if ($n > $max) $max = $n;
                }
                $next = $prefix . '-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $rows = $pdo->query("SELECT a.*, s.nombre as sede_nombre FROM areas a LEFT JOIN sedes s ON a.sede_id = s.id ORDER BY a.nombre ASC")->fetchAll();
            json_response(['areas' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['nombre'])) {
                json_response(['error' => 'El nombre es obligatorio'], 400);
            }
            $stmt = $pdo->prepare("INSERT INTO areas (codigo, nombre, descripcion, sede_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'], 
                $b['descripcion'] ?? '',
                $b['sede_id'] ?? 1
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            if (empty($b['id']) || empty($b['nombre'])) {
                json_response(['error' => 'ID y nombre son obligatorios'], 400);
            }
            $stmt = $pdo->prepare("UPDATE areas SET codigo = ?, nombre = ?, descripcion = ?, sede_id = ? WHERE id = ?");
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'], 
                $b['descripcion'] ?? '', 
                $b['sede_id'] ?? 1,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            
            // Verificar si hay personal vinculado
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM personal WHERE area_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() > 0) {
                json_response(['error' => 'No se puede eliminar: hay personal vinculado a esta área'], 400);
            }
            
            $pdo->prepare("DELETE FROM areas WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
