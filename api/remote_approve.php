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
    $oc = $pdo->prepare("SELECT numero_oc, aprobado_gerente, aprobado_finanzas FROM ordenes_compra WHERE id = ?");
    $oc->execute([$id]);
    $res = $oc->fetch();

    if ($res['aprobado_gerente'] && $res['aprobado_finanzas']) {
        $pdo->prepare("UPDATE ordenes_compra SET estado = 'Aprobada' WHERE id = ?")->execute([$id]);
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
            " . ($res['aprobado_gerente'] && $res['aprobado_finanzas'] ? 
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
