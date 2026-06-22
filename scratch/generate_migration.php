<?php
// scratch/generate_migration.php
// Script para generar la migración automática basada en el esquema local.

require_once __DIR__ . '/../includes/db.php';

try {
    // Conectar a la base de datos local usando las credenciales locales de db.php
    // Pero forzando la conexión a la base de datos local directamente
    $pdo = new PDO('mysql:host=127.0.0.1;port=3307;dbname=catolica_school;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    echo "Conectado a la base de datos local.\n";

    // Obtener todas las tablas
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

    $migrationData = [];

    foreach ($tables as $table) {
        echo "Procesando tabla: $table\n";

        // Obtener el DDL de creación
        $createStmt = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
        $createSql = $createStmt['Create Table'];

        // Obtener las columnas
        $columns = $pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll();

        $colsData = [];
        $previousCol = null;
        foreach ($columns as $col) {
            $colName = $col['Field'];
            $type = $col['Type'];
            $null = $col['Null'] === 'NO' ? 'NOT NULL' : 'NULL';
            
            $default = '';
            if ($col['Default'] !== null) {
                if (strpos(strtolower($col['Default']), 'current_timestamp') !== false) {
                    $default = 'DEFAULT CURRENT_TIMESTAMP';
                } else {
                    $default = 'DEFAULT ' . $pdo->quote($col['Default']);
                }
            } else if ($col['Null'] === 'YES') {
                $default = 'DEFAULT NULL';
            }

            $extra = $col['Extra']; // auto_increment, etc.
            
            $definition = trim("$type $null $default $extra");
            
            $colsData[$colName] = [
                'definition' => $definition,
                'after' => $previousCol
            ];
            $previousCol = $colName;
        }

        $migrationData[$table] = [
            'create_sql' => $createSql,
            'columns' => $colsData
        ];
    }

    // Generar el código PHP de api/migrate.php
    $exportData = var_export($migrationData, true);

    $template = <<<PHP
<?php
// api/migrate.php - Migración automática de base de datos
// Generado automáticamente por Antigravity para sincronizar estructura con la BD local.

ob_start();
require_once __DIR__ . '/../includes/db.php';

// Habilitar reporte de errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    \$pdo = db();
    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Desactivar temporalmente revisión de llaves foráneas para evitar problemas al crear tablas en desorden
    \$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    \$schema = $exportData;
    
    \$logs = [];
    \$errors = [];

    foreach (\$schema as \$table => \$info) {
        // Verificar si la tabla existe
        \$tableCheck = \$pdo->query("SHOW TABLES LIKE '\$table'")->fetch();
        
        if (!\$tableCheck) {
            // Crear la tabla si no existe
            \$logs[] = "Tabla '\$table' no existe. Creándola...";
            \$pdo->exec(\$info['create_sql']);
            \$logs[] = "Tabla '\$table' creada con éxito.";
        } else {
            // Si la tabla existe, verificar cada columna
            \$existingCols = \$pdo->query("SHOW COLUMNS FROM `\$table`")->fetchAll(PDO::FETCH_COLUMN);
            
            foreach (\$info['columns'] as \$colName => \$colInfo) {
                if (!in_array(\$colName, \$existingCols)) {
                    \$logs[] = "Columna '\$colName' no existe en la tabla '\$table'. Agregándola...";
                    
                    \$afterClause = \$colInfo['after'] ? " AFTER `{\$colInfo['after']}`" : " FIRST";
                    \$alterSql = "ALTER TABLE `\$table` ADD COLUMN `\$colName` {\$colInfo['definition']}{\$afterClause};";
                    
                    \$pdo->exec(\$alterSql);
                    \$logs[] = "Columna '\$colName' agregada a '\$table' con éxito.";
                }
            }
        }
    }

    // Actualizar registros históricos con fecha de creación como fallback si las columnas eran nuevas
    \$stmt1 = \$pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion_gerente = created_at WHERE aprobado_gerente = 1 AND fecha_aprobacion_gerente IS NULL");
    if (\$stmt1 > 0) {
        \$logs[] = "Se actualizaron \$stmt1 registros históricos de Gerencia con fecha de creación como fallback.";
    }
    \$stmt2 = \$pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion_finanzas = created_at WHERE aprobado_finanzas = 1 AND fecha_aprobacion_finanzas IS NULL");
    if (\$stmt2 > 0) {
        \$logs[] = "Se actualizaron \$stmt2 registros históricos de Finanzas con fecha de creación como fallback.";
    }
    \$stmt3 = \$pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion = created_at WHERE aprobado_gerente = 1 AND aprobado_finanzas = 1 AND fecha_aprobacion IS NULL");
    if (\$stmt3 > 0) {
        \$logs[] = "Se actualizaron \$stmt3 registros históricos de aprobación total con fecha de creación como fallback.";
    }

    // Reactivar revisión de llaves foráneas
    \$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    ob_clean();
    json_response([
        'ok' => true,
        'mensaje' => 'Sincronización de base de datos completada con éxito.',
        'logs' => \$logs
    ]);

} catch (Throwable \$e) {
    // Asegurarse de reactivar llaves foráneas
    if (isset(\$pdo)) {
        \$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    }
    ob_clean();
    json_response([
        'error' => \$e->getMessage(),
        'trace' => \$e->getTraceAsString(),
        'logs' => isset(\$logs) ? \$logs : []
    ], 500);
}
PHP;

    file_put_contents(__DIR__ . '/../api/migrate.php', $template);
    echo "api/migrate.php generado exitosamente con el esquema de " . count($tables) . " tablas.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
