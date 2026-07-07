<?php
/**
 * Script para cambiar RQ-2026-001 de Req_Finalizada → Req_Gestionando
 * ELIMINAR después de ejecutar.
 */
require_once __DIR__ . '/includes/db.php';

$pdo = db();

// Verificar estado actual
$actual = $pdo->query("SELECT id, numero_oc, estado FROM ordenes_compra WHERE numero_oc = 'RQ-2026-001'")->fetch(PDO::FETCH_ASSOC);

if (!$actual) {
    die('<p style="color:red;font-family:sans-serif">❌ No se encontró RQ-2026-001 en la base de datos.</p>');
}

// Aplicar cambio
$pdo->prepare("UPDATE ordenes_compra SET estado = 'Req_Gestionando', fecha_finalizacion = NULL WHERE numero_oc = 'RQ-2026-001'")->execute();

// Verificar resultado
$nuevo = $pdo->query("SELECT id, numero_oc, estado FROM ordenes_compra WHERE numero_oc = 'RQ-2026-001'")->fetch(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Fix RQ-2026-001</title>
<style>body{font-family:system-ui,sans-serif;max-width:500px;margin:60px auto;padding:20px;background:#f8fafc;}
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:24px;}
.ok{color:#16a34a;font-weight:700;} .note{color:#64748b;font-size:0.85rem;margin-top:12px;}</style>
</head>
<body>
<div class="card">
  <h2 style="margin-top:0">✅ Cambio aplicado</h2>
  <p><strong>Antes:</strong> <code><?= htmlspecialchars($actual['estado']) ?></code></p>
  <p><strong>Ahora:</strong> <span class="ok"><?= htmlspecialchars($nuevo['estado']) ?></span></p>
  <p class="note">⚠️ Elimina este archivo del servidor después de usarlo.</p>
</div>
</body>
</html>
