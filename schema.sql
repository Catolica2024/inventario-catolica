-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: catolica_school
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activos`
--

DROP TABLE IF EXISTS `activos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_serie` varchar(50) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `ubicacion_id` int(11) DEFAULT NULL,
  `personal_id` int(11) DEFAULT NULL,
  `estado` enum('Operativo','Mantenimiento','Baja','Reparación') DEFAULT 'Operativo',
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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `areas`
--

DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `areas` (
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asignaciones`
--

DROP TABLE IF EXISTS `asignaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asignaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activo_id` int(11) NOT NULL,
  `personal_id` int(11) NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `fecha_devolucion` date DEFAULT NULL,
  `estado` enum('Activo','Devuelto','Extraviado') DEFAULT 'Activo',
  `condicion_entrega` varchar(100) DEFAULT 'Bueno',
  `condicion_devolucion` varchar(100) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `activo_id` (`activo_id`),
  KEY `personal_id` (`personal_id`),
  CONSTRAINT `asignaciones_ibfk_1` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_ibfk_2` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categorias_inventario`
--

DROP TABLE IF EXISTS `categorias_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias_inventario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('insumo','mobiliario','equipo','activo') DEFAULT 'insumo',
  `stock_minimo` int(11) DEFAULT 5,
  `creado_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `prefijo` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prefijo` (`prefijo`),
  UNIQUE KEY `prefijo_2` (`prefijo`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `items` (
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
  `unidad_medida` varchar(50) DEFAULT 'Unidad',
  `unidad_compra` varchar(50) DEFAULT 'Unidad',
  `factor_conversion` decimal(10,2) DEFAULT 1.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `items_ibfk_1` (`categoria_inventario_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`categoria_inventario_id`) REFERENCES `categorias_inventario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mantenimientos`
--

DROP TABLE IF EXISTS `mantenimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mantenimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activo_id` int(11) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `cantidad` int(11) DEFAULT 1,
  `proveedor_id` int(11) DEFAULT NULL,
  `tipo` enum('Preventivo','Correctivo') DEFAULT 'Correctivo',
  `estado` enum('Pendiente','En Proceso','Completado','Cancelado') DEFAULT 'En Proceso',
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movimientos`
--

DROP TABLE IF EXISTS `movimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `tipo` enum('Entrada','Salida','Baja') NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `titulo` varchar(100) DEFAULT NULL,
  `mensaje` text DEFAULT NULL,
  `tipo` varchar(20) DEFAULT 'info',
  `leido` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_compra`
--

DROP TABLE IF EXISTS `ordenes_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ordenes_compra` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creado_por` int(11) DEFAULT NULL,
  `numero_oc` varchar(20) DEFAULT NULL,
  `tipo` enum('compra','servicio') DEFAULT 'compra',
  `proveedor_id` int(11) NOT NULL,
  `activo_id` int(11) DEFAULT NULL,
  `area_id` int(11) DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `estado` enum('Pendiente','Aprobada','Rechazada','Recibida','Completada') DEFAULT 'Pendiente',
  `fecha_aprobacion` datetime DEFAULT NULL,
  `pagado` tinyint(1) DEFAULT 0,
  `fecha_pago` datetime DEFAULT NULL,
  `voucher_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `area_solicitante` varchar(150) DEFAULT NULL,
  `moneda` enum('PEN','USD','EUR') DEFAULT 'PEN',
  `condicion_pago` enum('Al contado','Transferencia','Credito','Adelanto + Saldo') DEFAULT 'Al contado',
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
  `pdf_oc_url` varchar(500) DEFAULT NULL COMMENT 'Link de Google Drive del PDF de OC/OS',
  `pdf_mov_url` varchar(500) DEFAULT NULL COMMENT 'Link de Google Drive del PDF de Movilidad',
  `dentro_presupuesto` tinyint(1) DEFAULT 1,
  `es_alquiler` tinyint(1) NOT NULL DEFAULT 0,
  `dia_pago` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_oc` (`numero_oc`),
  KEY `proveedor_id` (`proveedor_id`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `ordenes_compra_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `ordenes_compra_ibfk_2` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_compra_items`
--

DROP TABLE IF EXISTS `ordenes_compra_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ordenes_compra_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orden_id` int(11) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `unidad` varchar(50) DEFAULT 'Unidad',
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
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_compra_tokens`
--

DROP TABLE IF EXISTS `ordenes_compra_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ordenes_compra_tokens` (
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
) ENGINE=InnoDB AUTO_INCREMENT=233 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_cuotas`
--

DROP TABLE IF EXISTS `ordenes_cuotas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ordenes_cuotas` (
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
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_movilidad`
--

DROP TABLE IF EXISTS `ordenes_movilidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ordenes_movilidad` (
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
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `personal`
--

DROP TABLE IF EXISTS `personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `dni` varchar(15) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `area_id` int(11) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `personal_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `proveedores` (
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
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `motivo_baja` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ruc` (`ruc`),
  KEY `categoria_id` (`rubro_id`),
  CONSTRAINT `proveedores_ibfk_1` FOREIGN KEY (`rubro_id`) REFERENCES `rubros` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `can_delete` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rubros`
--

DROP TABLE IF EXISTS `rubros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rubros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('insumo','activo') DEFAULT 'insumo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sedes`
--

DROP TABLE IF EXISTS `sedes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sedes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(5) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `distrito` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `creado_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_ubicaciones`
--

DROP TABLE IF EXISTS `stock_ubicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_ubicaciones` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `traslados`
--

DROP TABLE IF EXISTS `traslados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `traslados` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `ubicacion_origen_id` int(11) DEFAULT NULL,
  `ubicacion_destino_id` int(11) DEFAULT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `fecha` date NOT NULL,
  `responsable_id` int(11) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `tipo` varchar(20) DEFAULT 'Salida',
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ubicaciones`
--

DROP TABLE IF EXISTS `ubicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ubicaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `pabellon` varchar(50) DEFAULT NULL,
  `piso` int(11) DEFAULT NULL,
  `responsable_id` int(11) DEFAULT NULL,
  `sede_id` int(11) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `codigo_2` (`codigo`),
  KEY `responsable_id` (`responsable_id`),
  CONSTRAINT `ubicaciones_ibfk_1` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ubicaciones_historial`
--

DROP TABLE IF EXISTS `ubicaciones_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ubicaciones_historial` (
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
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `personal_id` int(11) DEFAULT NULL,
  `rol_id` int(11) NOT NULL,
  `permisos` text DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `rol_id` (`rol_id`),
  KEY `fk_usuario_personal` (`personal_id`),
  CONSTRAINT `fk_usuario_personal` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-10 11:04:04
