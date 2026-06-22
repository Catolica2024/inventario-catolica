<?php
// api/migrate.php - Migración automática de base de datos
// Generado automáticamente por Antigravity para sincronizar estructura con la BD local.

ob_start();
require_once __DIR__ . '/../includes/db.php';

// Habilitar reporte de errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    $pdo = db();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Desactivar temporalmente revisión de llaves foráneas para evitar problemas al crear tablas en desorden
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    $schema = array (
  'activos' => 
  array (
    'create_sql' => 'CREATE TABLE `activos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_serie` varchar(50) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `ubicacion_id` int(11) DEFAULT NULL,
  `personal_id` int(11) DEFAULT NULL,
  `estado` enum(\'Operativo\',\'Mantenimiento\',\'Baja\',\'Reparación\') DEFAULT \'Operativo\',
  `observaciones_tecnicas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `codigo_interno` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_serie` (`numero_serie`),
  UNIQUE KEY `codigo_interno` (`codigo_interno`),
  KEY `item_id` (`item_id`),
  KEY `ubicacion_id` (`ubicacion_id`),
  KEY `personal_id` (`personal_id`),
  CONSTRAINT `activos_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `activos_ibfk_2` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`),
  CONSTRAINT `activos_ibfk_3` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'numero_serie' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'item_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'numero_serie',
      ),
      'ubicacion_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'item_id',
      ),
      'personal_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'ubicacion_id',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'Operativo\',\'Mantenimiento\',\'Baja\',\'Reparación\') NULL DEFAULT \'Operativo\'',
        'after' => 'personal_id',
      ),
      'observaciones_tecnicas' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'estado',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'observaciones_tecnicas',
      ),
      'codigo_interno' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'created_at',
      ),
    ),
  ),
  'areas' => 
  array (
    'create_sql' => 'CREATE TABLE `areas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `sede_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_areas_sede` (`sede_id`),
  CONSTRAINT `fk_areas_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'codigo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'codigo',
      ),
      'descripcion' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'sede_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'descripcion',
      ),
    ),
  ),
  'asignaciones' => 
  array (
    'create_sql' => 'CREATE TABLE `asignaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activo_id` int(11) NOT NULL,
  `personal_id` int(11) NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `fecha_devolucion` date DEFAULT NULL,
  `estado` enum(\'Activo\',\'Devuelto\',\'Extraviado\') DEFAULT \'Activo\',
  `condicion_entrega` varchar(100) DEFAULT \'Bueno\',
  `condicion_devolucion` varchar(100) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `activo_id` (`activo_id`),
  KEY `personal_id` (`personal_id`),
  CONSTRAINT `asignaciones_ibfk_1` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_ibfk_2` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'activo_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'personal_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'activo_id',
      ),
      'fecha_asignacion' => 
      array (
        'definition' => 'date NOT NULL',
        'after' => 'personal_id',
      ),
      'fecha_devolucion' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'fecha_asignacion',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'Activo\',\'Devuelto\',\'Extraviado\') NULL DEFAULT \'Activo\'',
        'after' => 'fecha_devolucion',
      ),
      'condicion_entrega' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT \'Bueno\'',
        'after' => 'estado',
      ),
      'condicion_devolucion' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'condicion_entrega',
      ),
      'observaciones' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'condicion_devolucion',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'observaciones',
      ),
    ),
  ),
  'categorias_inventario' => 
  array (
    'create_sql' => 'CREATE TABLE `categorias_inventario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum(\'insumo\',\'mobiliario\',\'equipo\',\'activo\') DEFAULT \'insumo\',
  `stock_minimo` int(11) DEFAULT 5,
  `creado_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `prefijo` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prefijo` (`prefijo`),
  UNIQUE KEY `prefijo_2` (`prefijo`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'id',
      ),
      'descripcion' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'tipo' => 
      array (
        'definition' => 'enum(\'insumo\',\'mobiliario\',\'equipo\',\'activo\') NULL DEFAULT \'insumo\'',
        'after' => 'descripcion',
      ),
      'stock_minimo' => 
      array (
        'definition' => 'int(11) NULL DEFAULT \'5\'',
        'after' => 'tipo',
      ),
      'creado_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'stock_minimo',
      ),
      'prefijo' => 
      array (
        'definition' => 'varchar(10) NOT NULL',
        'after' => 'creado_at',
      ),
    ),
  ),
  'items' => 
  array (
    'create_sql' => 'CREATE TABLE `items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `categoria_inventario_id` int(11) DEFAULT NULL,
  `ficha_tecnica` text DEFAULT NULL,
  `stock_minimo` int(11) DEFAULT 0,
  `imagen` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `unidad_medida` varchar(50) DEFAULT \'Unidad\',
  `unidad_compra` varchar(50) DEFAULT \'Unidad\',
  `factor_conversion` decimal(10,2) DEFAULT 1.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `items_ibfk_1` (`categoria_inventario_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`categoria_inventario_id`) REFERENCES `categorias_inventario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'codigo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(150) NOT NULL',
        'after' => 'codigo',
      ),
      'marca' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'modelo' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'marca',
      ),
      'categoria_inventario_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'modelo',
      ),
      'ficha_tecnica' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'categoria_inventario_id',
      ),
      'stock_minimo' => 
      array (
        'definition' => 'int(11) NULL DEFAULT \'0\'',
        'after' => 'ficha_tecnica',
      ),
      'imagen' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'stock_minimo',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'imagen',
      ),
      'unidad_medida' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT \'Unidad\'',
        'after' => 'created_at',
      ),
      'unidad_compra' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT \'Unidad\'',
        'after' => 'unidad_medida',
      ),
      'factor_conversion' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'1.00\'',
        'after' => 'unidad_compra',
      ),
    ),
  ),
  'mantenimientos' => 
  array (
    'create_sql' => 'CREATE TABLE `mantenimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activo_id` int(11) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `cantidad` int(11) DEFAULT 1,
  `proveedor_id` int(11) DEFAULT NULL,
  `tipo` enum(\'Preventivo\',\'Correctivo\') DEFAULT \'Correctivo\',
  `estado` enum(\'Pendiente\',\'En Proceso\',\'Completado\',\'Cancelado\') DEFAULT \'En Proceso\',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `costo` decimal(10,2) DEFAULT 0.00,
  `descripcion_problema` text DEFAULT NULL,
  `descripcion_solucion` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `orden_compra_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `activo_id` (`activo_id`),
  KEY `item_id` (`item_id`),
  KEY `proveedor_id` (`proveedor_id`),
  CONSTRAINT `mantenimientos_ibfk_1` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mantenimientos_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mantenimientos_ibfk_3` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'activo_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'item_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'activo_id',
      ),
      'cantidad' => 
      array (
        'definition' => 'int(11) NULL DEFAULT \'1\'',
        'after' => 'item_id',
      ),
      'proveedor_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'cantidad',
      ),
      'tipo' => 
      array (
        'definition' => 'enum(\'Preventivo\',\'Correctivo\') NULL DEFAULT \'Correctivo\'',
        'after' => 'proveedor_id',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'Pendiente\',\'En Proceso\',\'Completado\',\'Cancelado\') NULL DEFAULT \'En Proceso\'',
        'after' => 'tipo',
      ),
      'fecha_inicio' => 
      array (
        'definition' => 'date NOT NULL',
        'after' => 'estado',
      ),
      'fecha_fin' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'fecha_inicio',
      ),
      'costo' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'0.00\'',
        'after' => 'fecha_fin',
      ),
      'descripcion_problema' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'costo',
      ),
      'descripcion_solucion' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'descripcion_problema',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'descripcion_solucion',
      ),
      'orden_compra_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'created_at',
      ),
    ),
  ),
  'movimientos' => 
  array (
    'create_sql' => 'CREATE TABLE `movimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `tipo` enum(\'Entrada\',\'Salida\',\'Baja\') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `ubicacion_id` int(11) DEFAULT NULL,
  `personal_destinatario_id` int(11) DEFAULT NULL,
  `despachado_por_id` int(11) DEFAULT NULL,
  `responsable_id` int(11) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  `observacion` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `responsable_id` (`responsable_id`),
  KEY `ubicacion_id` (`ubicacion_id`),
  KEY `personal_destinatario_id` (`personal_destinatario_id`),
  KEY `despachado_por_id` (`despachado_por_id`),
  CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`),
  CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_ibfk_4` FOREIGN KEY (`personal_destinatario_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_ibfk_5` FOREIGN KEY (`despachado_por_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'item_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'tipo' => 
      array (
        'definition' => 'enum(\'Entrada\',\'Salida\',\'Baja\') NOT NULL',
        'after' => 'item_id',
      ),
      'cantidad' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'tipo',
      ),
      'ubicacion_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'cantidad',
      ),
      'personal_destinatario_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'ubicacion_id',
      ),
      'despachado_por_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'personal_destinatario_id',
      ),
      'responsable_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'despachado_por_id',
      ),
      'fecha' => 
      array (
        'definition' => 'datetime NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'responsable_id',
      ),
      'observacion' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'fecha',
      ),
    ),
  ),
  'notificaciones' => 
  array (
    'create_sql' => 'CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `titulo` varchar(100) DEFAULT NULL,
  `mensaje` text DEFAULT NULL,
  `tipo` varchar(20) DEFAULT \'info\',
  `leido` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'usuario_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'titulo' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'usuario_id',
      ),
      'mensaje' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'titulo',
      ),
      'tipo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT \'info\'',
        'after' => 'mensaje',
      ),
      'leido' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'tipo',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'leido',
      ),
    ),
  ),
  'ordenes_compra' => 
  array (
    'create_sql' => 'CREATE TABLE `ordenes_compra` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creado_por` int(11) DEFAULT NULL,
  `numero_oc` varchar(20) DEFAULT NULL,
  `tipo` enum(\'compra\',\'servicio\') DEFAULT \'compra\',
  `proveedor_id` int(11) NOT NULL,
  `activo_id` int(11) DEFAULT NULL,
  `area_id` int(11) DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `estado` enum(\'Pendiente\',\'Aprobada\',\'Rechazada\',\'Recibida\',\'Completada\') DEFAULT \'Pendiente\',
  `fecha_aprobacion` datetime DEFAULT NULL,
  `pagado` tinyint(1) DEFAULT 0,
  `fecha_pago` datetime DEFAULT NULL,
  `voucher_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `area_solicitante` varchar(150) DEFAULT NULL,
  `moneda` enum(\'PEN\',\'USD\',\'EUR\') DEFAULT \'PEN\',
  `condicion_pago` enum(\'Al contado\',\'Transferencia\',\'Credito\',\'Adelanto + Saldo\') DEFAULT \'Al contado\',
  `condicion_detalle` varchar(100) DEFAULT NULL,
  `adelanto_porcentaje` decimal(5,2) DEFAULT NULL,
  `adelanto_monto` decimal(10,2) DEFAULT NULL,
  `saldo_monto` decimal(10,2) DEFAULT NULL,
  `adelanto_pagado` tinyint(1) DEFAULT 0,
  `adelanto_fecha` datetime DEFAULT NULL,
  `adelanto_voucher` text DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_requerida` date DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `igv` decimal(10,2) DEFAULT 0.00,
  `igv_porcentaje` decimal(5,2) DEFAULT 18.00,
  `precios_con_igv` tinyint(1) DEFAULT 0,
  `total` decimal(10,2) DEFAULT 0.00,
  `observaciones` text DEFAULT NULL,
  `aprobado_gerente` tinyint(1) DEFAULT 0,
  `fecha_aprobacion_gerente` datetime DEFAULT NULL,
  `aprobado_finanzas` tinyint(1) DEFAULT 0,
  `fecha_aprobacion_finanzas` datetime DEFAULT NULL,
  `motivo_rechazo` text DEFAULT NULL,
  `rechazo_por` varchar(100) DEFAULT NULL,
  `rechazado_gerente` tinyint(1) DEFAULT 0,
  `rechazado_finanzas` tinyint(1) DEFAULT 0,
  `fecha_recepcion` date DEFAULT NULL,
  `comprobante_url` text DEFAULT NULL,
  `conformidad_url` text DEFAULT NULL,
  `fecha_conformidad` datetime DEFAULT NULL,
  `stock_actualizado` tinyint(1) DEFAULT 0,
  `sin_conformidad` tinyint(1) DEFAULT 0,
  `incluye_movilidad` tinyint(1) DEFAULT 1,
  `monto_movilidad` decimal(10,2) DEFAULT 0.00,
  `pdf_oc_url` varchar(500) DEFAULT NULL COMMENT \'Link de Google Drive del PDF de OC/OS\',
  `pdf_mov_url` varchar(500) DEFAULT NULL COMMENT \'Link de Google Drive del PDF de Movilidad\',
  `dentro_presupuesto` tinyint(1) DEFAULT 1,
  `es_alquiler` tinyint(1) NOT NULL DEFAULT 0,
  `dia_pago` tinyint(4) DEFAULT NULL,
  `fecha_pago_adelanto` date DEFAULT NULL,
  `fecha_pago_saldo_proyectado` date DEFAULT NULL,
  `ultimo_recordatorio` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_oc` (`numero_oc`),
  KEY `proveedor_id` (`proveedor_id`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `ordenes_compra_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `ordenes_compra_ibfk_2` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'creado_por' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'numero_oc' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'creado_por',
      ),
      'tipo' => 
      array (
        'definition' => 'enum(\'compra\',\'servicio\') NULL DEFAULT \'compra\'',
        'after' => 'numero_oc',
      ),
      'proveedor_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'tipo',
      ),
      'activo_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'proveedor_id',
      ),
      'area_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'activo_id',
      ),
      'fecha' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'area_id',
      ),
      'monto' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT NULL',
        'after' => 'fecha',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'Pendiente\',\'Aprobada\',\'Rechazada\',\'Recibida\',\'Completada\') NULL DEFAULT \'Pendiente\'',
        'after' => 'monto',
      ),
      'fecha_aprobacion' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'estado',
      ),
      'pagado' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'fecha_aprobacion',
      ),
      'fecha_pago' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'pagado',
      ),
      'voucher_url' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'fecha_pago',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'voucher_url',
      ),
      'area_solicitante' => 
      array (
        'definition' => 'varchar(150) NULL DEFAULT NULL',
        'after' => 'created_at',
      ),
      'moneda' => 
      array (
        'definition' => 'enum(\'PEN\',\'USD\',\'EUR\') NULL DEFAULT \'PEN\'',
        'after' => 'area_solicitante',
      ),
      'condicion_pago' => 
      array (
        'definition' => 'enum(\'Al contado\',\'Transferencia\',\'Credito\',\'Adelanto + Saldo\') NULL DEFAULT \'Al contado\'',
        'after' => 'moneda',
      ),
      'condicion_detalle' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'condicion_pago',
      ),
      'adelanto_porcentaje' => 
      array (
        'definition' => 'decimal(5,2) NULL DEFAULT NULL',
        'after' => 'condicion_detalle',
      ),
      'adelanto_monto' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT NULL',
        'after' => 'adelanto_porcentaje',
      ),
      'saldo_monto' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT NULL',
        'after' => 'adelanto_monto',
      ),
      'adelanto_pagado' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'saldo_monto',
      ),
      'adelanto_fecha' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'adelanto_pagado',
      ),
      'adelanto_voucher' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'adelanto_fecha',
      ),
      'fecha_vencimiento' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'adelanto_voucher',
      ),
      'fecha_requerida' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'fecha_vencimiento',
      ),
      'subtotal' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'0.00\'',
        'after' => 'fecha_requerida',
      ),
      'igv' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'0.00\'',
        'after' => 'subtotal',
      ),
      'igv_porcentaje' => 
      array (
        'definition' => 'decimal(5,2) NULL DEFAULT \'18.00\'',
        'after' => 'igv',
      ),
      'precios_con_igv' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'igv_porcentaje',
      ),
      'total' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'0.00\'',
        'after' => 'precios_con_igv',
      ),
      'observaciones' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'total',
      ),
      'aprobado_gerente' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'observaciones',
      ),
      'fecha_aprobacion_gerente' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'aprobado_gerente',
      ),
      'aprobado_finanzas' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'fecha_aprobacion_gerente',
      ),
      'fecha_aprobacion_finanzas' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'aprobado_finanzas',
      ),
      'motivo_rechazo' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'fecha_aprobacion_finanzas',
      ),
      'rechazo_por' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'motivo_rechazo',
      ),
      'rechazado_gerente' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'rechazo_por',
      ),
      'rechazado_finanzas' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'rechazado_gerente',
      ),
      'fecha_recepcion' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'rechazado_finanzas',
      ),
      'comprobante_url' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'fecha_recepcion',
      ),
      'conformidad_url' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'comprobante_url',
      ),
      'fecha_conformidad' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'conformidad_url',
      ),
      'stock_actualizado' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'fecha_conformidad',
      ),
      'sin_conformidad' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'stock_actualizado',
      ),
      'incluye_movilidad' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'1\'',
        'after' => 'sin_conformidad',
      ),
      'monto_movilidad' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'0.00\'',
        'after' => 'incluye_movilidad',
      ),
      'pdf_oc_url' => 
      array (
        'definition' => 'varchar(500) NULL DEFAULT NULL',
        'after' => 'monto_movilidad',
      ),
      'pdf_mov_url' => 
      array (
        'definition' => 'varchar(500) NULL DEFAULT NULL',
        'after' => 'pdf_oc_url',
      ),
      'dentro_presupuesto' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'1\'',
        'after' => 'pdf_mov_url',
      ),
      'es_alquiler' => 
      array (
        'definition' => 'tinyint(1) NOT NULL DEFAULT \'0\'',
        'after' => 'dentro_presupuesto',
      ),
      'dia_pago' => 
      array (
        'definition' => 'tinyint(4) NULL DEFAULT NULL',
        'after' => 'es_alquiler',
      ),
      'fecha_pago_adelanto' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'dia_pago',
      ),
      'fecha_pago_saldo_proyectado' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'fecha_pago_adelanto',
      ),
      'ultimo_recordatorio' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'fecha_pago_saldo_proyectado',
      ),
    ),
  ),
  'ordenes_compra_items' => 
  array (
    'create_sql' => 'CREATE TABLE `ordenes_compra_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orden_id` int(11) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `unidad` varchar(50) DEFAULT \'Unidad\',
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `precio_unitario` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `item_id` int(11) DEFAULT NULL,
  `categoria_nombre` varchar(100) DEFAULT NULL,
  `prefijo` varchar(10) DEFAULT NULL,
  `factor_conversion` decimal(10,2) DEFAULT 1.00,
  PRIMARY KEY (`id`),
  KEY `orden_id` (`orden_id`),
  CONSTRAINT `ordenes_compra_items_ibfk_1` FOREIGN KEY (`orden_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'orden_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'descripcion' => 
      array (
        'definition' => 'varchar(255) NOT NULL',
        'after' => 'orden_id',
      ),
      'unidad' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT \'Unidad\'',
        'after' => 'descripcion',
      ),
      'cantidad' => 
      array (
        'definition' => 'int(11) NOT NULL DEFAULT \'1\'',
        'after' => 'unidad',
      ),
      'precio_unitario' => 
      array (
        'definition' => 'decimal(10,2) NOT NULL DEFAULT \'0.00\'',
        'after' => 'cantidad',
      ),
      'total' => 
      array (
        'definition' => 'decimal(10,2) NOT NULL DEFAULT \'0.00\'',
        'after' => 'precio_unitario',
      ),
      'item_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'total',
      ),
      'categoria_nombre' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'item_id',
      ),
      'prefijo' => 
      array (
        'definition' => 'varchar(10) NULL DEFAULT NULL',
        'after' => 'categoria_nombre',
      ),
      'factor_conversion' => 
      array (
        'definition' => 'decimal(10,2) NULL DEFAULT \'1.00\'',
        'after' => 'prefijo',
      ),
    ),
  ),
  'ordenes_compra_tokens' => 
  array (
    'create_sql' => 'CREATE TABLE `ordenes_compra_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orden_id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `rol` varchar(50) NOT NULL,
  `expiracion` datetime NOT NULL,
  `usado` tinyint(1) DEFAULT 0,
  `usado_en` datetime DEFAULT NULL,
  `email_destinatario` varchar(255) DEFAULT NULL,
  `ip_aprobador` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `orden_id` (`orden_id`),
  CONSTRAINT `ordenes_compra_tokens_ibfk_1` FOREIGN KEY (`orden_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=235 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'orden_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'token' => 
      array (
        'definition' => 'varchar(64) NOT NULL',
        'after' => 'orden_id',
      ),
      'rol' => 
      array (
        'definition' => 'varchar(50) NOT NULL',
        'after' => 'token',
      ),
      'expiracion' => 
      array (
        'definition' => 'datetime NOT NULL',
        'after' => 'rol',
      ),
      'usado' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'expiracion',
      ),
      'usado_en' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'usado',
      ),
      'email_destinatario' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'usado_en',
      ),
      'ip_aprobador' => 
      array (
        'definition' => 'varchar(45) NULL DEFAULT NULL',
        'after' => 'email_destinatario',
      ),
    ),
  ),
  'ordenes_cuotas' => 
  array (
    'create_sql' => 'CREATE TABLE `ordenes_cuotas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orden_id` int(11) NOT NULL,
  `numero_cuota` int(11) NOT NULL,
  `total_cuotas` int(11) NOT NULL,
  `monto_cuota` decimal(10,2) NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `pagado` tinyint(1) DEFAULT 0,
  `fecha_pago` datetime DEFAULT NULL,
  `voucher_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `descripcion` varchar(100) DEFAULT NULL,
  `comprobante_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orden_id` (`orden_id`),
  CONSTRAINT `ordenes_cuotas_ibfk_1` FOREIGN KEY (`orden_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'orden_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'numero_cuota' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'orden_id',
      ),
      'total_cuotas' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'numero_cuota',
      ),
      'monto_cuota' => 
      array (
        'definition' => 'decimal(10,2) NOT NULL',
        'after' => 'total_cuotas',
      ),
      'fecha_vencimiento' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'monto_cuota',
      ),
      'pagado' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'fecha_vencimiento',
      ),
      'fecha_pago' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'pagado',
      ),
      'voucher_url' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'fecha_pago',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'voucher_url',
      ),
      'descripcion' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'created_at',
      ),
      'comprobante_url' => 
      array (
        'definition' => 'varchar(500) NULL DEFAULT NULL',
        'after' => 'descripcion',
      ),
    ),
  ),
  'ordenes_movilidad' => 
  array (
    'create_sql' => 'CREATE TABLE `ordenes_movilidad` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orden_id` int(11) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `proveedor_id` int(11) DEFAULT NULL,
  `voucher_url` varchar(255) DEFAULT NULL,
  `pagado` tinyint(1) DEFAULT 0,
  `fecha_pago` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orden_id` (`orden_id`),
  KEY `fk_mob_supplier` (`proveedor_id`),
  CONSTRAINT `fk_mob_supplier` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `ordenes_movilidad_ibfk_1` FOREIGN KEY (`orden_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'orden_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'monto' => 
      array (
        'definition' => 'decimal(10,2) NOT NULL',
        'after' => 'orden_id',
      ),
      'descripcion' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'monto',
      ),
      'fecha' => 
      array (
        'definition' => 'date NULL DEFAULT NULL',
        'after' => 'descripcion',
      ),
      'proveedor_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'fecha',
      ),
      'voucher_url' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'proveedor_id',
      ),
      'pagado' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'voucher_url',
      ),
      'fecha_pago' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'pagado',
      ),
    ),
  ),
  'personal' => 
  array (
    'create_sql' => 'CREATE TABLE `personal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `dni` varchar(15) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `area_id` int(11) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `estado` enum(\'activo\',\'inactivo\') DEFAULT \'activo\',
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `personal_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'codigo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'dni' => 
      array (
        'definition' => 'varchar(15) NULL DEFAULT NULL',
        'after' => 'codigo',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(150) NOT NULL',
        'after' => 'dni',
      ),
      'cargo' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'area' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'cargo',
      ),
      'area_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'area',
      ),
      'telefono' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'area_id',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'activo\',\'inactivo\') NULL DEFAULT \'activo\'',
        'after' => 'telefono',
      ),
    ),
  ),
  'proveedores' => 
  array (
    'create_sql' => 'CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ruc` varchar(11) DEFAULT NULL,
  `razon_social` varchar(150) NOT NULL,
  `banco` varchar(100) DEFAULT NULL,
  `numero_cuenta` varchar(50) DEFAULT NULL,
  `cci` varchar(50) DEFAULT NULL,
  `cuenta_detraccion` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contacto` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `rubro_id` int(11) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `estado` enum(\'activo\',\'inactivo\') DEFAULT \'activo\',
  `motivo_baja` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ruc` (`ruc`),
  KEY `categoria_id` (`rubro_id`),
  CONSTRAINT `proveedores_ibfk_1` FOREIGN KEY (`rubro_id`) REFERENCES `rubros` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'ruc' => 
      array (
        'definition' => 'varchar(11) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'razon_social' => 
      array (
        'definition' => 'varchar(150) NOT NULL',
        'after' => 'ruc',
      ),
      'banco' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'razon_social',
      ),
      'numero_cuenta' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'banco',
      ),
      'cci' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'numero_cuenta',
      ),
      'cuenta_detraccion' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'cci',
      ),
      'email' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'cuenta_detraccion',
      ),
      'contacto' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'email',
      ),
      'telefono' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'contacto',
      ),
      'rubro_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'telefono',
      ),
      'direccion' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'rubro_id',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'activo\',\'inactivo\') NULL DEFAULT \'activo\'',
        'after' => 'direccion',
      ),
      'motivo_baja' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'estado',
      ),
    ),
  ),
  'roles' => 
  array (
    'create_sql' => 'CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `can_delete` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(50) NOT NULL',
        'after' => 'id',
      ),
      'descripcion' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'can_delete' => 
      array (
        'definition' => 'tinyint(1) NULL DEFAULT \'0\'',
        'after' => 'descripcion',
      ),
    ),
  ),
  'rubros' => 
  array (
    'create_sql' => 'CREATE TABLE `rubros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum(\'insumo\',\'activo\') DEFAULT \'insumo\',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'codigo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'codigo',
      ),
      'descripcion' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'tipo' => 
      array (
        'definition' => 'enum(\'insumo\',\'activo\') NULL DEFAULT \'insumo\'',
        'after' => 'descripcion',
      ),
    ),
  ),
  'sedes' => 
  array (
    'create_sql' => 'CREATE TABLE `sedes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(5) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `distrito` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `creado_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'codigo' => 
      array (
        'definition' => 'varchar(5) NOT NULL',
        'after' => 'id',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'codigo',
      ),
      'distrito' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'provincia' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'distrito',
      ),
      'direccion' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'provincia',
      ),
      'creado_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'direccion',
      ),
    ),
  ),
  'stock_ubicaciones' => 
  array (
    'create_sql' => 'CREATE TABLE `stock_ubicaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `ubicacion_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_ubicacion` (`item_id`,`ubicacion_id`),
  KEY `ubicacion_id` (`ubicacion_id`),
  CONSTRAINT `stock_ubicaciones_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `stock_ubicaciones_ibfk_2` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'item_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'ubicacion_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'item_id',
      ),
      'cantidad' => 
      array (
        'definition' => 'int(11) NOT NULL DEFAULT \'0\'',
        'after' => 'ubicacion_id',
      ),
      'updated_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP on update current_timestamp()',
        'after' => 'cantidad',
      ),
    ),
  ),
  'traslados' => 
  array (
    'create_sql' => 'CREATE TABLE `traslados` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `ubicacion_origen_id` int(11) DEFAULT NULL,
  `ubicacion_destino_id` int(11) DEFAULT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `fecha` date NOT NULL,
  `responsable_id` int(11) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `tipo` varchar(20) DEFAULT \'Salida\',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `ubicacion_origen_id` (`ubicacion_origen_id`),
  KEY `ubicacion_destino_id` (`ubicacion_destino_id`),
  KEY `responsable_id` (`responsable_id`),
  CONSTRAINT `traslados_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `traslados_ibfk_2` FOREIGN KEY (`ubicacion_origen_id`) REFERENCES `ubicaciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `traslados_ibfk_3` FOREIGN KEY (`ubicacion_destino_id`) REFERENCES `ubicaciones` (`id`),
  CONSTRAINT `traslados_ibfk_4` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'item_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'ubicacion_origen_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'item_id',
      ),
      'ubicacion_destino_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'ubicacion_origen_id',
      ),
      'cantidad' => 
      array (
        'definition' => 'int(11) NOT NULL DEFAULT \'1\'',
        'after' => 'ubicacion_destino_id',
      ),
      'fecha' => 
      array (
        'definition' => 'date NOT NULL',
        'after' => 'cantidad',
      ),
      'responsable_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'fecha',
      ),
      'motivo' => 
      array (
        'definition' => 'varchar(255) NULL DEFAULT NULL',
        'after' => 'responsable_id',
      ),
      'observaciones' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'motivo',
      ),
      'tipo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT \'Salida\'',
        'after' => 'observaciones',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'tipo',
      ),
    ),
  ),
  'ubicaciones' => 
  array (
    'create_sql' => 'CREATE TABLE `ubicaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `pabellon` varchar(50) DEFAULT NULL,
  `piso` int(11) DEFAULT NULL,
  `responsable_id` int(11) DEFAULT NULL,
  `sede_id` int(11) DEFAULT NULL,
  `estado` enum(\'activo\',\'inactivo\') DEFAULT \'activo\',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `codigo_2` (`codigo`),
  KEY `responsable_id` (`responsable_id`),
  CONSTRAINT `ubicaciones_ibfk_1` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'codigo' => 
      array (
        'definition' => 'varchar(20) NULL DEFAULT NULL',
        'after' => 'id',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'codigo',
      ),
      'tipo' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'pabellon' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'tipo',
      ),
      'piso' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'pabellon',
      ),
      'responsable_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'piso',
      ),
      'sede_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'responsable_id',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'activo\',\'inactivo\') NULL DEFAULT \'activo\'',
        'after' => 'sede_id',
      ),
    ),
  ),
  'ubicaciones_historial' => 
  array (
    'create_sql' => 'CREATE TABLE `ubicaciones_historial` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ubicacion_id` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `responsable_id` int(11) DEFAULT NULL,
  `fecha_desde` datetime DEFAULT current_timestamp(),
  `fecha_hasta` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ubicacion_id` (`ubicacion_id`),
  CONSTRAINT `ubicaciones_historial_ibfk_1` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'ubicacion_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'id',
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NULL DEFAULT NULL',
        'after' => 'ubicacion_id',
      ),
      'tipo' => 
      array (
        'definition' => 'varchar(50) NULL DEFAULT NULL',
        'after' => 'nombre',
      ),
      'responsable_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'tipo',
      ),
      'fecha_desde' => 
      array (
        'definition' => 'datetime NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'responsable_id',
      ),
      'fecha_hasta' => 
      array (
        'definition' => 'datetime NULL DEFAULT NULL',
        'after' => 'fecha_desde',
      ),
    ),
  ),
  'usuarios' => 
  array (
    'create_sql' => 'CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `personal_id` int(11) DEFAULT NULL,
  `rol_id` int(11) NOT NULL,
  `permisos` text DEFAULT NULL,
  `estado` enum(\'activo\',\'inactivo\') DEFAULT \'activo\',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `rol_id` (`rol_id`),
  KEY `fk_usuario_personal` (`personal_id`),
  CONSTRAINT `fk_usuario_personal` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'columns' => 
    array (
      'id' => 
      array (
        'definition' => 'int(11) NOT NULL  auto_increment',
        'after' => NULL,
      ),
      'nombre' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'id',
      ),
      'email' => 
      array (
        'definition' => 'varchar(100) NOT NULL',
        'after' => 'nombre',
      ),
      'password_hash' => 
      array (
        'definition' => 'varchar(255) NOT NULL',
        'after' => 'email',
      ),
      'personal_id' => 
      array (
        'definition' => 'int(11) NULL DEFAULT NULL',
        'after' => 'password_hash',
      ),
      'rol_id' => 
      array (
        'definition' => 'int(11) NOT NULL',
        'after' => 'personal_id',
      ),
      'permisos' => 
      array (
        'definition' => 'text NULL DEFAULT NULL',
        'after' => 'rol_id',
      ),
      'estado' => 
      array (
        'definition' => 'enum(\'activo\',\'inactivo\') NULL DEFAULT \'activo\'',
        'after' => 'permisos',
      ),
      'created_at' => 
      array (
        'definition' => 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'after' => 'estado',
      ),
    ),
  ),
);
    
    $logs = [];
    $errors = [];

    foreach ($schema as $table => $info) {
        // Verificar si la tabla existe
        $tableCheck = $pdo->query("SHOW TABLES LIKE '$table'")->fetch();
        
        if (!$tableCheck) {
            // Crear la tabla si no existe
            $logs[] = "Tabla '$table' no existe. Creándola...";
            $pdo->exec($info['create_sql']);
            $logs[] = "Tabla '$table' creada con éxito.";
        } else {
            // Si la tabla existe, verificar cada columna
            $existingCols = $pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($info['columns'] as $colName => $colInfo) {
                if (!in_array($colName, $existingCols)) {
                    $logs[] = "Columna '$colName' no existe en la tabla '$table'. Agregándola...";
                    
                    $afterClause = $colInfo['after'] ? " AFTER `{$colInfo['after']}`" : " FIRST";
                    $alterSql = "ALTER TABLE `$table` ADD COLUMN `$colName` {$colInfo['definition']}{$afterClause};";
                    
                    $pdo->exec($alterSql);
                    $logs[] = "Columna '$colName' agregada a '$table' con éxito.";
                }
            }
        }
    }

    // Actualizar registros históricos con fecha de creación como fallback si las columnas eran nuevas
    $stmt1 = $pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion_gerente = created_at WHERE aprobado_gerente = 1 AND fecha_aprobacion_gerente IS NULL");
    if ($stmt1 > 0) {
        $logs[] = "Se actualizaron $stmt1 registros históricos de Gerencia con fecha de creación como fallback.";
    }
    $stmt2 = $pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion_finanzas = created_at WHERE aprobado_finanzas = 1 AND fecha_aprobacion_finanzas IS NULL");
    if ($stmt2 > 0) {
        $logs[] = "Se actualizaron $stmt2 registros históricos de Finanzas con fecha de creación como fallback.";
    }
    $stmt3 = $pdo->exec("UPDATE ordenes_compra SET fecha_aprobacion = created_at WHERE aprobado_gerente = 1 AND aprobado_finanzas = 1 AND fecha_aprobacion IS NULL");
    if ($stmt3 > 0) {
        $logs[] = "Se actualizaron $stmt3 registros históricos de aprobación total con fecha de creación como fallback.";
    }

    // Reactivar revisión de llaves foráneas
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    ob_clean();
    json_response([
        'ok' => true,
        'mensaje' => 'Sincronización de base de datos completada con éxito.',
        'logs' => $logs
    ]);

} catch (Throwable $e) {
    // Asegurarse de reactivar llaves foráneas
    if (isset($pdo)) {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    }
    ob_clean();
    json_response([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'logs' => isset($logs) ? $logs : []
    ], 500);
}