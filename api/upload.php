<?php
// api/upload.php - Manejo de subida de archivos (comprobantes, vouchers)
require_once __DIR__ . '/../includes/db.php';

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
    // Retornar URL relativa para guardar en BD
    $relativeUrl = 'uploads/' . $newName;
    echo json_encode(['ok' => true, 'url' => $relativeUrl]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Error al mover el archivo']);
}
