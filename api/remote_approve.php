<?php
// api/remote_approve.php - Procesa aprobaciones externas desde el correo
require_once __DIR__ . '/../includes/db.php';

$token = $_GET['token'] ?? null;

if (!$token) {
    die("Token no proporcionado");
}

try {
    $pdo = db();
    
    // Buscar el token
    $stmt = $pdo->prepare("SELECT * FROM ordenes_compra_tokens WHERE token = ? AND usado = 0 AND expiracion > NOW()");
    $stmt->execute([$token]);
    $t = $stmt->fetch();

    if (!$t) {
        die("El enlace ha expirado o ya ha sido utilizado.");
    }

    $id = $t['orden_id'];
    $rol = $t['rol'];
    $action = $_GET['action'] ?? 'approve';

    // Obtener datos de la OC
    $ocStmt = $pdo->prepare("SELECT numero_oc, creado_por, tipo FROM ordenes_compra WHERE id = ?");
    $ocStmt->execute([$id]);
    $res = $ocStmt->fetch();

    if ($action === 'reject') {
        $motivo = $_POST['motivo'] ?? null;
        
        if (!$motivo) {
            // Mostrar formulario de rechazo
            echo "
            <!DOCTYPE html>
            <html lang='es'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Rechazar Orden</title>
                <script src='https://cdn.tailwindcss.com'></script>
            </head>
            <body class='bg-slate-50 flex items-center justify-center min-h-screen p-4 font-sans'>
                <div class='bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100'>
                    <h1 class='text-2xl font-bold text-slate-800 mb-2 text-center'>Rechazar Orden</h1>
                    <p class='text-slate-600 mb-6 text-center text-sm'>Indique el motivo por el cual rechaza la orden <span class='font-bold'>{$res['numero_oc']}</span>.</p>
                    
                    <form method='POST'>
                        <div class='mb-4'>
                            <label class='block text-sm font-medium text-slate-700 mb-1'>Motivo del rechazo</label>
                            <textarea name='motivo' required class='w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-32' placeholder='Ej: El precio es muy elevado...'></textarea>
                        </div>
                        <button type='submit' class='w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors'>
                            Confirmar Rechazo
                        </button>
                    </form>
                </div>
            </body>
            </html>";
            exit;
        }

        // Procesar rechazo
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE ordenes_compra_tokens SET usado = 1 WHERE id = ?")->execute([$t['id']]);
        
        $quien = ($rol === 'gerente_general' ? 'Gerente General' : 'Jefe de Finanzas');
        $col = ($rol === 'gerente_general' ? 'rechazado_gerente' : 'rechazado_finanzas');
        
        $nota = " | Rechazo ({$quien}): " . $motivo;
        $pdo->prepare("UPDATE ordenes_compra SET estado = 'Rechazada', {$col} = 1, observaciones = CONCAT(IFNULL(observaciones,''), ?) WHERE id = ?")
            ->execute([$nota, $id]);

        // Notificar al creador
        $msg = "La " . ($res['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$res['numero_oc']} ha sido RECHAZADA por {$quien}. Motivo: {$motivo}";
        $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documento Rechazado', ?, 'error')")
            ->execute([$res['creado_por'], $msg]);

        $pdo->commit();

        echo "
        <!DOCTYPE html>
        <html lang='es'>
        <head>
            <meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Rechazo Registrado</title>
            <script src='https://cdn.tailwindcss.com'></script>
        </head>
        <body class='bg-slate-50 flex items-center justify-center min-h-screen p-4 font-sans'>
            <div class='bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100'>
                <div class='w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6'>
                    <svg xmlns='http://www.w3.org/2000/svg' class='h-10 w-10' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 18L18 6M6 6l12 12' /></svg>
                </div>
                <h1 class='text-2xl font-bold text-slate-800 mb-2'>Rechazo Registrado</h1>
                <p class='text-slate-600'>La orden {$res['numero_oc']} ha sido marcada como rechazada.</p>
                <div class='mt-8'><p class='text-xs text-slate-400'>Ya puede cerrar esta ventana.</p></div>
            </div>
        </body>
        </html>";
        exit;
    }

    // FLUJO DE APROBACIÓN (Acción por defecto)
    $pdo->beginTransaction();

    // 1. Marcar el token como usado
    $pdo->prepare("UPDATE ordenes_compra_tokens SET usado = 1 WHERE id = ?")->execute([$t['id']]);

    // 2. Aplicar la firma correspondiente
    if ($rol === 'gerente_general') {
        $pdo->prepare("UPDATE ordenes_compra SET aprobado_gerente = 1 WHERE id = ?")->execute([$id]);
    } else if ($rol === 'jefe_finanzas') {
        $pdo->prepare("UPDATE ordenes_compra SET aprobado_finanzas = 1 WHERE id = ?")->execute([$id]);
    }

    // 3. Verificar si se completa la orden
    $check = $pdo->prepare("SELECT aprobado_gerente, aprobado_finanzas FROM ordenes_compra WHERE id = ?");
    $check->execute([$id]);
    $status = $check->fetch();

    if ($status['aprobado_gerente'] && $status['aprobado_finanzas']) {
        $pdo->prepare("UPDATE ordenes_compra SET estado = 'Aprobada' WHERE id = ?")->execute([$id]);
        // Notificar al creador
        $msg = "La " . ($res['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$res['numero_oc']} ha sido APROBADA totalmente.";
        $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Documento Aprobado', ?, 'success')")
            ->execute([$res['creado_por'], $msg]);
    } else {
        // Notificar aprobación parcial
        $quien = ($rol === 'gerente_general' ? 'el Gerente General' : 'el Jefe de Finanzas');
        $msg = "{$quien} ha aprobado la " . ($res['tipo'] === 'servicio' ? 'OS' : 'OC') . " {$res['numero_oc']}. Falta una firma.";
        $pdo->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, 'Aprobación Parcial', ?, 'info')")
            ->execute([$res['creado_por'], $msg]);
    }

    $pdo->commit();

    // Mostrar mensaje de éxito visualmente agradable
    echo "
    <!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Aprobación Exitosa</title>
        <script src='https://cdn.tailwindcss.com'></script>
    </head>
    <body class='bg-slate-50 flex items-center justify-center min-h-screen p-4 font-sans'>
        <div class='bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100'>
            <div class='w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6'>
                <svg xmlns='http://www.w3.org/2000/svg' class='h-10 w-10' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 13l4 4L19 7' />
                </svg>
            </div>
            <h1 class='text-2xl font-bold text-slate-800 mb-2'>¡Aprobación Registrada!</h1>
            <p class='text-slate-600 mb-6'>Usted ha firmado exitosamente la Orden de Compra <span class='font-mono font-bold text-indigo-600'>{$res['numero_oc']}</span>.</p>
            " . ($status['aprobado_gerente'] && $status['aprobado_finanzas'] ? 
                "<div class='bg-indigo-50 text-indigo-700 p-4 rounded-xl text-sm'><strong>Estado Final:</strong> APROBADA. La orden ya puede ser procesada.</div>" : 
                "<div class='bg-amber-50 text-amber-700 p-4 rounded-xl text-sm'><strong>Nota:</strong> Falta la firma de la otra área para que la orden sea oficial.</div>") . "
            <div class='mt-8'>
                <p class='text-xs text-slate-400'>Ya puede cerrar esta ventana.</p>
            </div>
        </div>
    </body>
    </html>";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    die("Error en el proceso: " . $e->getMessage());
}
