<?php
// api/categories.php — CRUD de categorías
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            // Acción especial: generar el siguiente código disponible
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $rows = $pdo->query("SELECT codigo FROM categorias WHERE codigo LIKE 'CAT-%'")->fetchAll();
                $max = 0;
                foreach ($rows as $row) {
                    $n = intval(substr($row['codigo'], 4));
                    if ($n > $max) $max = $n;
                }
                $next = 'CAT-' . str_pad($max + 1, 2, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            $rows = $pdo->query("SELECT * FROM categorias ORDER BY nombre ASC")->fetchAll();
            json_response(['categories' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            $sql = "INSERT INTO categorias (codigo, nombre, descripcion) VALUES (?,?,?)";
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
            $sql = "UPDATE categorias SET codigo=?, nombre=?, descripcion=? WHERE id=?";
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
            $stmt = $pdo->prepare("DELETE FROM categorias WHERE id = ?");
            $stmt->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
