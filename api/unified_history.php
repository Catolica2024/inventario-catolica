<?php
require_once __DIR__ . '/../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    $action = $_GET['action'] ?? '';
    $event_type = $_GET['event_type'] ?? '';
    $event_id = $_GET['id'] ?? '';

    if ($action !== 'delete' || !$event_type || !$event_id) {
        json_response(['error' => 'Parámetros inválidos para eliminación'], 400);
    }

    try {
        $pdo = db();
        if ($event_type === 'traslado') {
            $stmt = $pdo->prepare("DELETE FROM traslados WHERE id = ?");
            $stmt->execute([$event_id]);
        } elseif ($event_type === 'mantenimiento') {
            $stmt = $pdo->prepare("DELETE FROM mantenimientos WHERE id = ?");
            $stmt->execute([$event_id]);
        } elseif ($event_type === 'uso_espacio') {
            $stmt = $pdo->prepare("DELETE FROM ubicaciones_historial WHERE id = ?");
            $stmt->execute([$event_id]);
        } else {
            json_response(['error' => 'Tipo de evento no soportado para eliminación'], 400);
        }

        json_response(['ok' => true]);
    } catch (Exception $e) {
        json_response(['error' => $e->getMessage()], 500);
    }
    exit;
}

$type = $_GET['type'] ?? ''; // 'location' or 'staff'
$id = $_GET['id'] ?? '';

if (!$type || !$id) json_response(['error' => 'Tipo e ID requeridos'], 400);

try {
    $pdo = db();
    $history = [];

    if ($type === 'location') {
        // 1. Traslados (Mobiliario)
        $stmt = $pdo->prepare("
            SELECT 'traslado' as event_type, t.id, t.fecha, t.cantidad, i.nombre as item_name, 
                   u1.nombre as origen, u2.nombre as destino, t.tipo, t.motivo, NULL as fecha_hasta
            FROM traslados t
            JOIN items i ON t.item_id = i.id
            LEFT JOIN ubicaciones u1 ON t.ubicacion_origen_id = u1.id
            LEFT JOIN ubicaciones u2 ON t.ubicacion_destino_id = u2.id
            WHERE t.ubicacion_origen_id = ? OR t.ubicacion_destino_id = ?
        ");
        $stmt->execute([$id, $id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 2. Mantenimientos (Equipos en esta loc)
        $stmt = $pdo->prepare("
            SELECT 'mantenimiento' as event_type, m.id, m.fecha_inicio as fecha, 1 as cantidad, i.nombre as item_name,
                   m.tipo, m.estado, m.descripcion_problema as motivo, '' as tecnico, NULL as fecha_hasta
            FROM mantenimientos m
            JOIN activos a ON m.activo_id = a.id
            JOIN items i ON a.item_id = i.id
            WHERE a.ubicacion_id = ?
        ");
        $stmt->execute([$id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 3. Historial de Uso y Responsables de la Ubicación
        $stmt = $pdo->prepare("
            SELECT 'uso_espacio' as event_type, uh.id, uh.fecha_desde as fecha, 0 as cantidad, 
                   COALESCE(p.nombre, 'Sin responsable') as item_name,
                   uh.tipo as sub_tipo, uh.nombre as sub_nombre, '' as origen, '' as destino, 
                   'Uso y Responsable' as tipo, '' as motivo, uh.fecha_hasta
            FROM ubicaciones_historial uh
            LEFT JOIN personal p ON uh.responsable_id = p.id
            WHERE uh.ubicacion_id = ?
        ");
        $stmt->execute([$id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));

    } elseif ($type === 'staff') {
        // 1. Asignaciones (Equipos)
        $stmt = $pdo->prepare("
            SELECT 'asignacion' as event_type, a.fecha_asignacion as fecha, 1 as cantidad, i.nombre as item_name,
                   a.estado as tipo, '' as origen, '' as destino, '' as motivo
            FROM asignaciones a
            JOIN activos act ON a.activo_id = act.id
            JOIN items i ON act.item_id = i.id
            WHERE a.personal_id = ?
        ");
        $stmt->execute([$id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 2. Traslados donde fue responsable
        $stmt = $pdo->prepare("
            SELECT 'traslado_resp' as event_type, t.fecha, t.cantidad, i.nombre as item_name,
                   u1.nombre as origen, u2.nombre as destino, t.tipo, t.motivo
            FROM traslados t
            JOIN items i ON t.item_id = i.id
            LEFT JOIN ubicaciones u1 ON t.ubicacion_origen_id = u1.id
            LEFT JOIN ubicaciones u2 ON t.ubicacion_destino_id = u2.id
            WHERE t.responsable_id = ?
        ");
        $stmt->execute([$id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 3. Mantenimientos de equipos que tiene asignados
        $stmt = $pdo->prepare("
            SELECT 'mantenimiento' as event_type, m.fecha_inicio as fecha, 1 as cantidad, i.nombre as item_name,
                   m.tipo, m.estado, m.descripcion_problema as motivo, '' as tecnico
            FROM mantenimientos m
            JOIN activos act ON m.activo_id = act.id
            JOIN items i ON act.item_id = i.id
            JOIN asignaciones asig ON asig.activo_id = act.id
            WHERE asig.personal_id = ? AND asig.estado = 'Activo'
        ");
        $stmt->execute([$id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // Ordenar por fecha descendente
    usort($history, function($a, $b) {
        return strtotime($b['fecha']) - strtotime($a['fecha']);
    });

    json_response(['history' => $history]);

} catch (Exception $e) {
    json_response(['error' => $e->getMessage()], 500);
}
