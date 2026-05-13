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

                $prefix = $sedeCode . '-ESP';

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
            if (isset($_GET['action']) && $_GET['action'] === 'history') {
                $id = $_GET['id'] ?? null;
                if (!$id) json_response(['error' => 'id requerido'], 400);
                $stmt = $pdo->prepare("
                    SELECT h.*, p.nombre as responsable_nombre
                    FROM ubicaciones_historial h
                    LEFT JOIN personal p ON h.responsable_id = p.id
                    WHERE h.ubicacion_id = ?
                    ORDER BY h.fecha_desde DESC
                ");
                $stmt->execute([$id]);
                json_response(['history' => $stmt->fetchAll()]);
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
            $codigo = $b['codigo'] ?? null;
            if ($codigo) {
                $check = $pdo->prepare("SELECT id FROM ubicaciones WHERE codigo = ?");
                $check->execute([$codigo]);
                if ($check->fetch()) json_response(['error' => 'El código "' . $codigo . '" ya está en uso por otra ubicación.'], 400);
            }
            $sql = "INSERT INTO ubicaciones (codigo, nombre, tipo, responsable_id, sede_id, estado) VALUES (?,?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $codigo,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['responsable_id'] ?: null,
                $b['sede_id'] ?: null,
                $b['estado'] ?? 'activo'
            ]);
            $id = $pdo->lastInsertId();
            
            // Iniciar historial
            $pdo->prepare("INSERT INTO ubicaciones_historial (ubicacion_id, tipo, responsable_id) VALUES (?,?,?)")
                ->execute([$id, $b['tipo'] ?? null, $b['responsable_id'] ?: null]);

            json_response(['ok' => true, 'id' => $id]);
            break;

        case 'PUT':
            $b = get_body();
            $id = $b['id'];
            $codigo = $b['codigo'] ?? null;
            if ($codigo) {
                $check = $pdo->prepare("SELECT id FROM ubicaciones WHERE codigo = ? AND id != ?");
                $check->execute([$codigo, $id]);
                if ($check->fetch()) json_response(['error' => 'El código "' . $codigo . '" ya está en uso por otra ubicación.'], 400);
            }
            
            // Obtener estado actual para comparar
            $stmtCurr = $pdo->prepare("SELECT tipo, responsable_id FROM ubicaciones WHERE id = ?");
            $stmtCurr->execute([$id]);
            $curr = $stmtCurr->fetch();

            $sql = "UPDATE ubicaciones SET codigo=?, nombre=?, tipo=?, responsable_id=?, sede_id=?, estado=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $codigo,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['responsable_id'] ?: null,
                $b['sede_id'] ?: null,
                $b['estado'] ?? 'activo',
                $id
            ]);

            // Si el tipo o el responsable cambiaron, registrar en historial
            $newTipo = $b['tipo'] ?? null;
            $newResp = $b['responsable_id'] ?: null;

            if ($curr && ($curr['tipo'] !== $newTipo || $curr['responsable_id'] != $newResp)) {
                // Cerrar el historial anterior (el más reciente que no tenga fecha_hasta)
                $pdo->prepare("UPDATE ubicaciones_historial SET fecha_hasta = CURRENT_TIMESTAMP WHERE ubicacion_id = ? AND fecha_hasta IS NULL")
                    ->execute([$id]);
                
                // Insertar nuevo registro
                $pdo->prepare("INSERT INTO ubicaciones_historial (ubicacion_id, tipo, responsable_id) VALUES (?,?,?)")
                    ->execute([$id, $newTipo, $newResp]);
            }

            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            // Verificar dependencias
            $deps = [];
            $c = $pdo->query("SELECT COUNT(*) FROM activos WHERE ubicacion_id = $id")->fetchColumn();
            if ($c > 0) $deps[] = "$c equipo(s) asignado(s)";

            $c = $pdo->query("SELECT COUNT(*) FROM stock_ubicaciones WHERE ubicacion_id = $id")->fetchColumn();
            if ($c > 0) $deps[] = "$c lote(s) de mobiliario asignado(s)";

            if (!empty($deps)) {
                json_response(['error' => "No se puede eliminar la ubicación porque tiene: " . implode(", ", $deps) . ". Reubique estos bienes primero."], 400);
                break;
            }

            $pdo->prepare("DELETE FROM ubicaciones WHERE id = ?")->execute([$id]);
            json_response(['ok' => true]);
            break;

        default:
            json_response(['error' => 'Método no soportado'], 405);
    }
} catch (Throwable $e) {
    json_response(['error' => 'Error: ' . $e->getMessage()], 500);
}
