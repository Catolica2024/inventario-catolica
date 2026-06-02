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
                $pabellon = $_GET['pabellon'] ?? 'A';
                $piso = isset($_GET['piso']) ? intval($_GET['piso']) : 1;
                $sufijo = $_GET['sufijo'] ?? '';
                if (!$sede_id) json_response(['error' => 'sede_id requerido'], 400);

                // Obtener código de la sede
                $stmtSede = $pdo->prepare("SELECT codigo FROM sedes WHERE id = ?");
                $stmtSede->execute([$sede_id]);
                $sede = $stmtSede->fetch();
                $sedeCode = ($sede && $sede['codigo']) ? $sede['codigo'] : 'S';

                $prefixToStrip = $sedeCode . '-ESP-' . $pabellon;
                $prefixQuery = $sedeCode . '-ESP-' . $pabellon . $piso . '%';

                $rows = $pdo->prepare("SELECT codigo FROM ubicaciones WHERE codigo LIKE ? ORDER BY id DESC");
                $rows->execute([$prefixQuery]);
                $data = $rows->fetchAll();

                $minNum = $piso * 100 + 1;
                $maxNum = $piso * 100 + 99;

                $max = 0;
                $existSuffix = [];
                foreach ($data as $row) {
                    $code = $row['codigo'];
                    if (strpos($code, $prefixToStrip) === 0) {
                        $numStr = substr($code, strlen($prefixToStrip));
                        $numParts = explode('-', $numStr);
                        $numStr = $numParts[0]; // Extraer solo la parte numérica (ej: 103 de 103-A)
                        $s = $numParts[1] ?? '';
                        if (is_numeric($numStr)) {
                            $n = intval($numStr);
                            if ($n >= $minNum && $n <= $maxNum) {
                                if ($n > $max) $max = $n;
                                if (!isset($existSuffix[$n])) {
                                    $existSuffix[$n] = [];
                                }
                                if ($s !== '') {
                                    $existSuffix[$n][$s] = true;
                                }
                            }
                        }
                    }
                }

                $targetNum = null;
                $isBathroom = (stripos($tipo, 'hig') !== false);
                if ($isBathroom && ($sufijo === 'A' || $sufijo === 'B')) {
                    $opposite = ($sufijo === 'A') ? 'B' : 'A';
                    
                    // Buscamos el mayor número N que tenga la letra opuesta pero NO tenga nuestra letra
                    $candidates = [];
                    foreach ($existSuffix as $n => $suffixes) {
                        if (isset($suffixes[$opposite]) && !isset($suffixes[$sufijo])) {
                            $candidates[] = $n;
                        }
                    }
                    if (!empty($candidates)) {
                        $targetNum = max($candidates);
                    }
                }
                
                if ($targetNum !== null) {
                    $nextNum = $targetNum;
                } else {
                    $nextNum = ($max === 0) ? $minNum : ($max + 1);
                }
                
                $next = $prefixToStrip . $nextNum;
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
                ORDER BY u.sede_id ASC, u.pabellon ASC, u.piso ASC, u.codigo ASC
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
            $sql = "INSERT INTO ubicaciones (codigo, nombre, tipo, pabellon, piso, responsable_id, sede_id, estado) VALUES (?,?,?,?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $codigo,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['pabellon'] ?? null,
                $b['piso'] ? intval($b['piso']) : null,
                $b['responsable_id'] ?: null,
                $b['sede_id'] ?: null,
                $b['estado'] ?? 'activo'
            ]);
            $id = $pdo->lastInsertId();
            
            // Iniciar historial
            $pdo->prepare("INSERT INTO ubicaciones_historial (ubicacion_id, nombre, tipo, responsable_id) VALUES (?,?,?,?)")
                ->execute([$id, $b['nombre'], $b['tipo'] ?? null, $b['responsable_id'] ?: null]);

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
            $stmtCurr = $pdo->prepare("SELECT nombre, tipo, responsable_id FROM ubicaciones WHERE id = ?");
            $stmtCurr->execute([$id]);
            $curr = $stmtCurr->fetch();

            $sql = "UPDATE ubicaciones SET codigo=?, nombre=?, tipo=?, pabellon=?, piso=?, responsable_id=?, sede_id=?, estado=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $codigo,
                $b['nombre'],
                $b['tipo'] ?? null,
                $b['pabellon'] ?? null,
                $b['piso'] ? intval($b['piso']) : null,
                $b['responsable_id'] ?: null,
                $b['sede_id'] ?: null,
                $b['estado'] ?? 'activo',
                $id
            ]);

            // Si el nombre, tipo o el responsable cambiaron, registrar en historial
            $newNombre = $b['nombre'];
            $newTipo = $b['tipo'] ?? null;
            $newResp = $b['responsable_id'] ?: null;

            if ($curr && ($curr['nombre'] !== $newNombre || $curr['tipo'] !== $newTipo || $curr['responsable_id'] != $newResp)) {
                // Cerrar el historial anterior (el más reciente que no tenga fecha_hasta)
                $pdo->prepare("UPDATE ubicaciones_historial SET fecha_hasta = CURRENT_TIMESTAMP WHERE ubicacion_id = ? AND fecha_hasta IS NULL")
                    ->execute([$id]);
                
                // Insertar nuevo registro
                $pdo->prepare("INSERT INTO ubicaciones_historial (ubicacion_id, nombre, tipo, responsable_id) VALUES (?,?,?,?)")
                    ->execute([$id, $newNombre, $newTipo, $newResp]);
            }

            json_response(['ok' => true]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) json_response(['error' => 'ID requerido'], 400);

            // Verificar dependencias
            $deps = [];
            $stmtActivos = $pdo->prepare("SELECT COUNT(*) FROM activos WHERE ubicacion_id = ?");
            $stmtActivos->execute([$id]);
            $c = $stmtActivos->fetchColumn();
            if ($c > 0) $deps[] = "$c equipo(s) asignado(s)";

            $stmtStock = $pdo->prepare("SELECT COUNT(*) FROM stock_ubicaciones WHERE ubicacion_id = ?");
            $stmtStock->execute([$id]);
            $c = $stmtStock->fetchColumn();
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
