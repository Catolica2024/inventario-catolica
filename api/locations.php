<?php
// api/locations.php — CRUD de ubicaciones
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $sede_id = $_GET['sede_id'] ?? null;
                $tipo = $_GET['tipo'] ?? 'Otro';
                if (!$sede_id) json_response(['error' => 'sede_id requerido'], 400);

                // Obtener código de la sede
                $stmtSede = $pdo->prepare("SELECT codigo FROM sedes WHERE id = ?");
                $stmtSede->execute([$sede_id]);
                $sede = $stmtSede->fetch();
                $sedeCode = ($sede && $sede['codigo']) ? $sede['codigo'] : 'S';

                $typeCode = strtoupper(substr($tipo, 0, 3)); // Usar 3 letras
                $prefix = $sedeCode . '-' . $typeCode;

                $rows = $pdo->prepare("SELECT codigo FROM ubicaciones WHERE codigo LIKE ? ORDER BY id DESC LIMIT 50");
                $rows->execute([$prefix . '-%']);
                $data = $rows->fetchAll();

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
            $rows = $pdo->query("
                SELECT u.*, p.nombre as responsable_nombre, s.nombre as sede_nombre, s.codigo as sede_codigo
                FROM ubicaciones u
                LEFT JOIN personal p ON u.responsable_id = p.id
                LEFT JOIN sedes s ON u.sede_id = s.id
                ORDER BY u.nombre ASC
            ")->fetchAll();
            json_response(['locations' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO ubicaciones (codigo, nombre, tipo, responsable_id, sede_id) VALUES (?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['responsable_id'] ?: null,
                $b['sede_id'] ?: null
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE ubicaciones SET codigo=?, nombre=?, tipo=?, responsable_id=?, sede_id=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['responsable_id'] ?: null,
                $b['sede_id'] ?: null,
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
