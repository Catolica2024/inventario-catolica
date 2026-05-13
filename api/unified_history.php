<?php
require_once __DIR__ . '/../includes/db.php';

$type = $_GET['type'] ?? ''; // 'location' or 'staff'
$id = $_GET['id'] ?? '';

if (!$type || !$id) json_response(['error' => 'Tipo e ID requeridos'], 400);

try {
    $pdo = db();
    $history = [];

    if ($type === 'location') {
        // 1. Traslados (Mobiliario)
        $stmt = $pdo->prepare("
            SELECT 'traslado' as event_type, t.fecha, t.cantidad, i.nombre as item_name, 
                   u1.nombre as origen, u2.nombre as destino, t.tipo, t.motivo
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
            SELECT 'mantenimiento' as event_type, m.fecha_inicio as fecha, 1 as cantidad, i.nombre as item_name,
                   m.tipo, m.estado, m.descripcion_problema as motivo, '' as tecnico
            FROM mantenimientos m
            JOIN activos a ON m.activo_id = a.id
            JOIN items i ON a.item_id = i.id
            WHERE a.ubicacion_id = ?
        ");
        $stmt->execute([$id]);
        $history = array_merge($history, $stmt->fetchAll(PDO::FETCH_ASSOC));

        // 3. Historial de Responsables
        $stmt = $pdo->prepare("
            SELECT 'responsable' as event_type, uh.fecha_desde as fecha, 0 as cantidad, p.nombre as item_name,
                   uh.tipo as sub_tipo, '' as origen, '' as destino, 'Asignación' as tipo, '' as motivo
            FROM ubicaciones_historial uh
            JOIN personal p ON uh.responsable_id = p.id
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
