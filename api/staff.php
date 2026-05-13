<?php
// api/staff.php — CRUD de personal
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $stmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)) as max_val FROM personal WHERE codigo LIKE 'PER-%'");
                $max = $stmt->fetchColumn() ?: 0;
                $next = 'PER-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $rows = $pdo->query("
                SELECT p.*, a.nombre as area_nombre 
                FROM personal p 
                LEFT JOIN areas a ON p.area_id = a.id 
                ORDER BY p.nombre ASC
            ")->fetchAll();
            json_response(['staff' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['nombre'])) json_response(['error' => 'Nombre es obligatorio'], 400);
            
            // Auto-generar código si no viene
            if (empty($b['codigo'])) {
                $stmtMax = $pdo->query("SELECT MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)) as max_val FROM personal WHERE codigo LIKE 'PER-%'");
                $max = $stmtMax->fetchColumn() ?: 0;
                $b['codigo'] = 'PER-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
            }

            $stmt = $pdo->prepare("INSERT INTO personal (codigo, dni, nombre, cargo, area_id, telefono, estado) VALUES (?,?,?,?,?,?,?)");
            $stmt->execute([$b['codigo'], $b['dni'] ?? null, $b['nombre'], $b['cargo'] ?? null, $b['area_id'] ?? null, $b['telefono'] ?? null, $b['estado'] ?? 'activo']);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId(), 'codigo' => $b['codigo']]);
            break;

        case 'PUT':
            $b = get_body();
            $stmt = $pdo->prepare("UPDATE personal SET codigo=?, dni=?, nombre=?, cargo=?, area_id=?, telefono=?, estado=? WHERE id=?");
            $stmt->execute([$b['codigo'], $b['dni'] ?? null, $b['nombre'], $b['cargo'] ?? null, $b['area_id'] ?? null, $b['telefono'] ?? null, $b['estado'] ?? 'activo', $b['id']]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            $deps = [];
            $c = $pdo->query("SELECT COUNT(*) FROM activos WHERE personal_id = $id")->fetchColumn();
            if ($c > 0) $deps[] = "$c equipo(s) a su cargo";

            $c = $pdo->query("SELECT COUNT(*) FROM movimientos WHERE responsable_id = $id")->fetchColumn();
            if ($c > 0) $deps[] = "$c movimiento(s) de stock registrados";

            $c = $pdo->query("SELECT COUNT(*) FROM ubicaciones WHERE responsable_id = $id")->fetchColumn();
            if ($c > 0) $deps[] = "$c aula(s)/espacio(s) bajo su responsabilidad";

            if (!empty($deps)) {
                json_response(['error' => "No se puede eliminar a este personal porque tiene: " . implode(", ", $deps) . ". Reasigne estas responsabilidades primero."], 400);
                break;
            }

            $pdo->prepare("DELETE FROM personal WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
