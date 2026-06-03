<?php
// api/categories_inventario.php — CRUD de categorías de inventario
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
try {
    $pdo = db();
    switch ($method) {
        case 'GET':
            // Acción especial: generar el siguiente código disponible
            if (isset($_GET['action']) && $_GET['action'] === 'next_code') {
                $rows = $pdo->query("SELECT codigo FROM categorias_inventario WHERE codigo LIKE 'CAT-%' ORDER BY id DESC LIMIT 50")->fetchAll();
                $max = 0;
                foreach ($rows as $row) {
                    $parts = explode('-', $row['codigo']);
                    $n = intval(end($parts));
                    if ($n > $max) $max = $n;
                }
                $next = 'CAT-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
                json_response(['next_code' => $next]);
                break;
            }
            
            // Acción especial: generar prefijo único
            if (isset($_GET['action']) && $_GET['action'] === 'generate_prefix') {
                $name = $_GET['name'] ?? '';
                $excludeId = $_GET['exclude_id'] ?? null;
                $prefix = generateUniquePrefix($pdo, $name, $excludeId);
                json_response(['prefix' => $prefix]);
                break;
            }

            $rows = $pdo->query("SELECT * FROM categorias_inventario ORDER BY nombre ASC")->fetchAll();
            json_response(['categories' => $rows]);
            break;
            
        case 'POST':
            $b = get_body();
            if (empty($b['nombre'])) json_response(['error' => 'Nombre requerido'], 400);
            if (empty($b['prefijo'])) json_response(['error' => 'Prefijo requerido'], 400);
            
            // Validar prefijo único
            $check = $pdo->prepare("SELECT id FROM categorias_inventario WHERE prefijo = ?");
            $check->execute([$b['prefijo']]);
            if ($check->fetch()) json_response(['error' => 'El prefijo "' . $b['prefijo'] . '" ya está en uso'], 400);

            $sql = "INSERT INTO categorias_inventario (nombre, descripcion, tipo, stock_minimo, prefijo) VALUES (?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['nombre'],
                $b['descripcion'] ?? null,
                (empty($b['tipo']) ? 'insumo' : $b['tipo']),
                $b['stock_minimo'] ?? 5,
                strtoupper($b['prefijo'])
            ]);
            json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            $b = get_body();
            if (empty($b['id']) || empty($b['nombre'])) json_response(['error' => 'ID y Nombre requeridos'], 400);

            // Validar prefijo único (excluyendo el actual)
            if (!empty($b['prefijo'])) {
                $check = $pdo->prepare("SELECT id FROM categorias_inventario WHERE prefijo = ? AND id != ?");
                $check->execute([$b['prefijo'], $b['id']]);
                if ($check->fetch()) json_response(['error' => 'El prefijo ya está en uso'], 400);
            }

            $sql = "UPDATE categorias_inventario SET nombre=?, descripcion=?, tipo=?, stock_minimo=?, prefijo=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $b['nombre'],
                $b['descripcion'] ?? null,
                (empty($b['tipo']) ? 'insumo' : $b['tipo']),
                $b['stock_minimo'] ?? 5,
                strtoupper($b['prefijo']),
                $b['id']
            ]);
            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            // Verificar si hay artículos vinculados
            $count = $pdo->query("SELECT COUNT(*) FROM items WHERE categoria_inventario_id = $id")->fetchColumn();
            if ($count > 0) {
                json_response(['error' => "No se puede eliminar la categoría porque tiene $count artículo(s) vinculados en el Catálogo Maestro. Elimine o mueva esos artículos primero."], 400);
                break;
            }

            $pdo->prepare("DELETE FROM categorias_inventario WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}

function removeAccents($str) {
    $map = [
        'á'=>'a', 'é'=>'e', 'í'=>'i', 'ó'=>'o', 'ú'=>'u', 'ñ'=>'n',
        'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U', 'Ñ'=>'N',
        'ä'=>'a', 'ë'=>'e', 'ï'=>'i', 'ö'=>'o', 'ü'=>'u',
        'Ä'=>'A', 'Ë'=>'E', 'Ï'=>'I', 'Ö'=>'O', 'Ü'=>'U'
    ];
    return strtr($str, $map);
}

function generateUniquePrefix($pdo, $name, $excludeId = null) {
    $clean = removeAccents($name);
    $clean = strtoupper($clean);
    $clean = preg_replace('/[^A-Z0-9]/', '', $clean);
    
    if (strlen($clean) < 5) {
        $clean = str_pad($clean, 5, 'X', STR_PAD_RIGHT);
    }
    
    $base = substr($clean, 0, 5);
    $prefix = $base;
    
    $sql = "SELECT COUNT(*) FROM categorias_inventario WHERE prefijo = ?";
    if ($excludeId) {
        $sql .= " AND id != " . intval($excludeId);
    }
    $stmt = $pdo->prepare($sql);
    
    $attempt = 0;
    while (true) {
        $stmt->execute([$prefix]);
        if ($stmt->fetchColumn() == 0) {
            return $prefix;
        }
        
        $attempt++;
        if (5 + $attempt <= strlen($clean) && 5 + $attempt <= 10) {
            $prefix = substr($clean, 0, 5 + $attempt);
        } else {
            $suffix = (string)$attempt;
            $baseLen = max(4, 5 - strlen($suffix));
            $prefix = substr($base, 0, $baseLen) . $suffix;
        }
        
        if ($attempt > 999) {
            return substr($base, 0, 4) . rand(1000, 9999);
        }
    }
}
