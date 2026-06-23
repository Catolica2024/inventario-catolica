<?php
// includes/google_drive.php — Utilidad para subir archivos a Google Drive usando Service Account sin dependencias.

class GoogleDriveHelper {
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function getAccessToken($config) {
        $client_email = $config['client_email'] ?? '';
        $private_key = $config['private_key'] ?? '';

        if (!$client_email || !$private_key) {
            throw new Exception("Credenciales incompletas en la configuración de Google Drive.");
        }

        $now = time();
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $payload = json_encode([
            'iss' => $client_email,
            'sub' => $client_email,
            'scope' => 'https://www.googleapis.com/auth/drive',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600
        ]);

        $base64UrlHeader = self::base64url_encode($header);
        $base64UrlPayload = self::base64url_encode($payload);
        $signatureInput = $base64UrlHeader . "." . $base64UrlPayload;

        $signature = '';
        if (!openssl_sign($signatureInput, $signature, $private_key, OPENSSL_ALGO_SHA256)) {
            throw new Exception("Fallo al firmar el JWT con OpenSSL. Verifique su clave privada.");
        }

        $base64UrlSignature = self::base64url_encode($signature);
        $jwt = $signatureInput . "." . $base64UrlSignature;

        // Solicitar token de acceso a Google
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Evitar problemas locales de certificados SSL

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            throw new Exception("Error de red al solicitar token de acceso: " . $err);
        }

        $data = json_decode($response, true);
        if (isset($data['error'])) {
            throw new Exception("Error de Google Auth: " . ($data['error_description'] ?? $data['error']));
        }

        return $data['access_token'] ?? null;
    }

    public static function uploadFile($filePath, $fileName, $mimeType) {
        $configFile = __DIR__ . '/google_drive_config.json';
        if (!file_exists($configFile)) {
            return null; // Si no hay config, saltar silenciosamente (caer en almacenamiento local)
        }

        $config = json_decode(file_get_contents($configFile), true);
        if (!$config || !isset($config['client_email'])) {
            return null;
        }

        $accessToken = self::getAccessToken($config);
        if (!$accessToken) {
            throw new Exception("No se pudo obtener el token de acceso de Google.");
        }

        $folderId = $config['folder_id'] ?? null;

        // Construir cuerpo de petición multipart
        $metadata = [
            'name' => $fileName
        ];
        if ($folderId) {
            $metadata['parents'] = [$folderId];
        }

        $boundary = '-------' . uniqid();
        $delimiter = "\r\n--" . $boundary . "\r\n";
        $closeDelimiter = "\r\n--" . $boundary . "--";

        $fileData = file_get_contents($filePath);

        $body = $delimiter
            . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            . json_encode($metadata)
            . $delimiter
            . "Content-Type: " . $mimeType . "\r\n"
            . "Content-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($fileData))
            . $closeDelimiter;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: multipart/related; boundary=' . $boundary,
            'Content-Length: ' . strlen($body)
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            throw new Exception("Error de red al subir archivo a Drive: " . $err);
        }

        $fileInfo = json_decode($response, true);
        $fileId = $fileInfo['id'] ?? null;

        if (!$fileId) {
            throw new Exception("Error al subir a Google Drive: " . ($fileInfo['error']['message'] ?? $response));
        }

        // Hacer que el archivo sea visible para cualquier persona con el link (opcional, para visualización desde la UI)
        $chPerm = curl_init();
        curl_setopt($chPerm, CURLOPT_URL, "https://www.googleapis.com/drive/v3/files/{$fileId}/permissions");
        curl_setopt($chPerm, CURLOPT_POST, true);
        curl_setopt($chPerm, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chPerm, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($chPerm, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ]);
        curl_setopt($chPerm, CURLOPT_POSTFIELDS, json_encode([
            'role' => 'reader',
            'type' => 'anyone'
        ]));
        curl_exec($chPerm);
        curl_close($chPerm);

        // Retornar la URL directa de visualización o descarga
        return "https://drive.google.com/uc?export=view&id=" . $fileId;
    }
}
