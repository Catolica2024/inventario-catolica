<?php
// api/suppliers.php — CRUD de proveedores
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            $rows = $pdo->query("
                SELECT p.*, r.nombre as categoria_nombre
                FROM proveedores p
                LEFT JOIN rubros r ON p.rubro_id = r.id
                ORDER BY p.razon_social ASC
            ")->fetchAll();
            json_response(['suppliers' => $rows]);
            break;

        case 'POST':
            $b = get_body();
            if (empty($b['ruc']) || empty($b['razon_social'])) {
                json_response(['error' => 'RUC y Razón social son obligatorios'], 400);
            }
            $stmt = $pdo->prepare("INSERT INTO proveedores (ruc, razon_social, banco, numero_cuenta, cci, cuenta_detraccion, email, contacto, telefono, direccion, rubro_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([$b['ruc'], $b['razon_social'], $b['banco'] ?? null, $b['numero_cuenta'] ?? null, $b['cci'] ?? null, $b['cuenta_detraccion'] ?? null, $b['email'] ?? null, $b['contacto'], $b['telefono'], $b['direccion'], $b['rubro_id']]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            $stmt = $pdo->prepare("UPDATE proveedores SET ruc=?, razon_social=?, banco=?, numero_cuenta=?, cci=?, cuenta_detraccion=?, email=?, contacto=?, telefono=?, direccion=?, rubro_id=? WHERE id=?");
            $stmt->execute([$b['ruc'], $b['razon_social'], $b['banco'] ?? null, $b['numero_cuenta'] ?? null, $b['cci'] ?? null, $b['cuenta_detraccion'] ?? null, $b['email'] ?? null, $b['contacto'], $b['telefono'], $b['direccion'], $b['rubro_id'], $b['id']]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);
            $pdo->prepare("DELETE FROM proveedores WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
