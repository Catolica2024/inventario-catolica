<?php
// api/rubros.php — CRUD de rubros de proveedores
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            // Acción especial: generar el siguiente código disponible
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $rows = $pdo->query("SELECT codigo FROM rubros WHERE codigo LIKE 'RUB-%' ORDER BY id DESC LIMIT 50")->fetchAll();
                $max = 0;
                foreach ($rows as $row) {
                    $parts = explode('-', $row['codigo']);
                    $n = intval(end($parts));
                    if ($n > $max) $max = $n;
                }
                $next = 'RUB-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $rows = $pdo->query("SELECT * FROM rubros ORDER BY nombre ASC")->fetchAll();
            json_response(['rubros' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO rubros (codigo, nombre, descripcion) VALUES (?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['descripcion'] ?? null
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $sql = "UPDATE rubros SET codigo=?, nombre=?, descripcion=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['codigo'] ?? null,
                $b['nombre'],
                $b['descripcion'] ?? null,
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM rubros WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
