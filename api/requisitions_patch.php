<?php
// api/requisitions_patch.php — Parche de base de datos para flujo de requisiciones
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = db();
    $logs = [];
    $errors = [];

    // 1. Modificar areas para añadir parent_area_id y jefe_id si no existen
    $colsAreas = $pdo->query("SHOW COLUMNS FROM areas")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('parent_area_id', $colsAreas)) {
        $pdo->exec("ALTER TABLE areas ADD COLUMN parent_area_id INT NULL DEFAULT NULL");
        $pdo->exec("ALTER TABLE areas ADD CONSTRAINT fk_areas_parent FOREIGN KEY (parent_area_id) REFERENCES areas(id) ON DELETE SET NULL");
        $logs[] = "➕ Columna parent_area_id agregada a 'areas'.";
    }
    
    if (!in_array('jefe_id', $colsAreas)) {
        $pdo->exec("ALTER TABLE areas ADD COLUMN jefe_id INT NULL DEFAULT NULL");
        $logs[] = "➕ Columna jefe_id agregada a 'areas'.";
    }

    // 2. Modificar ordenes_compra: proveedor_id a NULL
    // En MariaDB/MySQL, para cambiar a NULL conservando la FK, primero desactivamos FK checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("ALTER TABLE ordenes_compra MODIFY COLUMN proveedor_id INT NULL;");
    $logs[] = "✅ Columna proveedor_id en ordenes_compra modificada para permitir NULL.";

    // 3. Modificar ordenes_compra: estado enum
    $pdo->exec("ALTER TABLE ordenes_compra MODIFY COLUMN estado ENUM(
        'Req_Pendiente_Area',
        'Req_Pendiente_Compras',
        'Req_Rechazada',
        'Pendiente',
        'Aprobada',
        'Rechazada',
        'Recibida',
        'Completada'
    ) DEFAULT 'Pendiente';");
    $logs[] = "✅ Columna estado en ordenes_compra actualizada con nuevos estados de requisición.";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // 4. Asegurar que exista el rol jefe_area
    $rolCheck = $pdo->prepare("SELECT id FROM roles WHERE nombre = ?");
    $rolCheck->execute(['jefe_area']);
    $rolJefeId = $rolCheck->fetchColumn();
    if (!$rolJefeId) {
        $pdo->exec("INSERT INTO roles (nombre, descripcion, can_delete) VALUES ('jefe_area', 'Jefe de Área: Gestiona requisiciones', 0)");
        $rolJefeId = $pdo->lastInsertId();
        $logs[] = "✅ Rol 'jefe_area' creado.";
    } else {
        $logs[] = "ℹ️ El rol 'jefe_area' ya existe.";
    }

    // Asegurar que exista el rol comprador
    $rolCompCheck = $pdo->prepare("SELECT id FROM roles WHERE nombre = ?");
    $rolCompCheck->execute(['comprador']);
    $rolCompradorId = $rolCompCheck->fetchColumn();
    if (!$rolCompradorId) {
        $pdo->exec("INSERT INTO roles (nombre, descripcion, can_delete) VALUES ('comprador', 'Comprador: Gestiona compras', 0)");
        $rolCompradorId = $pdo->lastInsertId();
        $logs[] = "✅ Rol 'comprador' creado.";
    }

    // 5. Insertar y configurar las Áreas de prueba
    $areasAInsertar = [
        ['nombre' => 'Pedagogía', 'codigo' => 'PED', 'parent' => null],
        ['nombre' => 'Psicología', 'codigo' => 'PSI', 'parent' => 'Pedagogía'],
        ['nombre' => 'Proyectos', 'codigo' => 'PROY', 'parent' => 'Pedagogía'],
        ['nombre' => 'Inicial', 'codigo' => 'INI', 'parent' => 'Pedagogía'],
        ['nombre' => 'Primaria', 'codigo' => 'PRI', 'parent' => 'Pedagogía'],
        ['nombre' => 'Secundaria', 'codigo' => 'SEC', 'parent' => 'Pedagogía'],
        ['nombre' => 'Sistemas', 'codigo' => 'SIS', 'parent' => null],
        ['nombre' => 'Marketing', 'codigo' => 'MKT', 'parent' => null],
    ];

    $areaIds = [];
    foreach ($areasAInsertar as $aInfo) {
        $stmt = $pdo->prepare("SELECT id FROM areas WHERE nombre = ?");
        $stmt->execute([$aInfo['nombre']]);
        $id = $stmt->fetchColumn();
        if (!$id) {
            $stmtIns = $pdo->prepare("INSERT INTO areas (codigo, nombre, descripcion) VALUES (?, ?, ?)");
            $stmtIns->execute([$aInfo['codigo'], $aInfo['nombre'], 'Área de ' . $aInfo['nombre']]);
            $id = $pdo->lastInsertId();
            $logs[] = "✅ Área '{$aInfo['nombre']}' creada.";
        } else {
            $logs[] = "ℹ️ Área '{$aInfo['nombre']}' ya existe.";
        }
        $areaIds[$aInfo['nombre']] = $id;
    }

    // Establecer jerarquía (parent_area_id)
    foreach ($areasAInsertar as $aInfo) {
        if ($aInfo['parent'] !== null) {
            $hId = $areaIds[$aInfo['nombre']];
            $pId = $areaIds[$aInfo['parent']];
            $pdo->prepare("UPDATE areas SET parent_area_id = ? WHERE id = ?")->execute([$pId, $hId]);
            $logs[] = "🔗 Área '{$aInfo['nombre']}' vinculada como hija de '{$aInfo['parent']}'.";
        }
    }

    // 6. Crear usuarios de prueba para verificar el flujo
    $testUsers = [
        [
            'nombre' => 'Jefe Pedagogia',
            'email' => 'jpedagogia@catolica.edu.pe',
            'rol_id' => $rolJefeId,
            'area_nombre' => 'Pedagogía'
        ],
        [
            'nombre' => 'Jefe Psicologia',
            'email' => 'jpsicologia@catolica.edu.pe',
            'rol_id' => $rolJefeId,
            'area_nombre' => 'Psicología'
        ],
        [
            'nombre' => 'Jefe Sistemas',
            'email' => 'jsistemas@catolica.edu.pe',
            'rol_id' => $rolJefeId,
            'area_nombre' => 'Sistemas'
        ],
        [
            'nombre' => 'Jefe Compras',
            'email' => 'jcompras@catolica.edu.pe',
            'rol_id' => $rolCompradorId,
            'area_nombre' => null
        ]
    ];

    $hash = password_hash('123456', PASSWORD_DEFAULT);

    foreach ($testUsers as $uData) {
        $uCheck = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $uCheck->execute([$uData['email']]);
        $uId = $uCheck->fetchColumn();

        if (!$uId) {
            // Crear personal primero si no existe
            $pId = null;
            if ($uData['area_nombre']) {
                $aId = $areaIds[$uData['area_nombre']];
                $stmtP = $pdo->prepare("INSERT INTO personal (codigo, nombre, cargo, area_id) VALUES (?, ?, ?, ?)");
                $stmtP->execute(['P-' . substr($uData['nombre'], 5), $uData['nombre'], 'Jefe de ' . $uData['area_nombre'], $aId]);
                $pId = $pdo->lastInsertId();
            }

            // Insertar usuario
            $stmtU = $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash, personal_id, rol_id, estado) VALUES (?, ?, ?, ?, ?, 'activo')");
            $stmtU->execute([$uData['nombre'], $uData['email'], $hash, $pId, $uData['rol_id']]);
            $uId = $pdo->lastInsertId();
            $logs[] = "👤 Usuario '{$uData['nombre']}' ({$uData['email']}) creado con clave '123456'.";
        } else {
            $logs[] = "ℹ️ Usuario '{$uData['nombre']}' ({$uData['email']}) ya existe.";
        }

        // Vincular jefe_id a la respectiva área
        if ($uData['area_nombre']) {
            $aId = $areaIds[$uData['area_nombre']];
            $pdo->prepare("UPDATE areas SET jefe_id = ? WHERE id = ?")->execute([$uId, $aId]);
            $logs[] = "👑 Usuario ID $uId asignado como jefe del área '{$uData['area_nombre']}'.";
        }
    }

    // Configurar FK de jefe_id en areas si no está referenciada
    // (Opcional, pero para consistencia agregamos la FK)
    try {
        $pdo->exec("ALTER TABLE areas ADD CONSTRAINT fk_areas_jefe FOREIGN KEY (jefe_id) REFERENCES usuarios(id) ON DELETE SET NULL");
        $logs[] = "✅ Restricción FK jefe_id agregada a areas.";
    } catch (Exception $e) {
        // Puede fallar si ya existe
    }

    echo json_encode([
        'ok' => true,
        'mensaje' => 'Parche de base de datos aplicado correctamente.',
        'logs' => $logs,
        'errores' => $errors
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
