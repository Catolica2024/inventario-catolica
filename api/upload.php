<?php
// api/upload.php - Manejo de subida de archivos (comprobantes, vouchers, fotos)
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/google_drive.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['file'])) {
    echo json_encode(['ok' => false, 'error' => 'No se recibió ningún archivo']);
    exit;
}

$file = $_FILES['file'];
$uploadDir = __DIR__ . '/../uploads/';

// Crear directorio si no existe
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$newName = uniqid('doc_') . '.' . $ext;
$targetPath = $uploadDir . $newName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $relativeUrl = 'uploads/' . $newName;
    $driveUrl = null;
    $uploadedToDrive = false;
    $driveError = null;

    try {
        // Intentar subir a Google Drive si las credenciales están configuradas
        $driveUrl = GoogleDriveHelper::uploadFile($targetPath, $newName, $file['type']);
        if ($driveUrl) {
            $uploadedToDrive = true;
            // Eliminar el archivo local para no ocupar espacio si se subió a Drive exitosamente
            @unlink($targetPath);
        }
    } catch (Exception $e) {
        $driveError = $e->getMessage();
        // Fallback al archivo local si falla Drive
    }

    $finalUrl = $uploadedToDrive ? $driveUrl : $relativeUrl;

    echo json_encode([
        'ok' => true,
        'url' => $finalUrl,
        'drive' => $uploadedToDrive,
        'error_drive' => $driveError
    ]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Error al mover el archivo']);
}

