-- Católica School - Esquema de Base de Datos Sincronizado para Hosting
-- Generado por Antigravity (Experto en Arquitectura de Software)

SET FOREIGN_KEY_CHECKS = 0;


-- 1. Roles y Permisos
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    can_delete TINYINT(1) DEFAULT 0
);

INSERT INTO roles (nombre, descripcion, can_delete) VALUES 
('admin', 'Superadministrador con acceso total', 1),
('gerente_general', 'Supervisión y aprobaciones estratégicas', 0),
('jefe_finanzas', 'Control presupuestario y financiero', 0),
('almacenero', 'Gestión física de almacenes y stock', 0),
('comprador', 'Gestión de adquisiciones y proveedores', 0),
('personal', 'Consulta y recepción de activos', 0),
('tesoreria', 'Procesamiento de pagos y vouchers', 0);

-- 2. Sedes y Áreas
CREATE TABLE IF NOT EXISTS sedes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    codigo VARCHAR(10) UNIQUE
);

INSERT INTO sedes (nombre, direccion, codigo) VALUES 
('Sede Central', 'Av. Institucional 123', 'SC'),
('Anexo Primaria', 'Calle Educación 456', 'AP');

CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    sede_id INT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id)
);

INSERT INTO areas (nombre, sede_id) VALUES 
('Tecnología', 1), ('Administración', 1), ('Finanzas', 1), ('Mantenimiento', 1);

-- 3. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    permisos TEXT,
    personal_id INT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Admin por defecto (admin123)
INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES 
('Admin Católica', 'admin@catolica.edu', '$2y$10$Zf/c5Zt9dv4OICPCvAsCJ.6tNLCZvNdamQk1euspaXbi.AxnSPuQW', 1);


-- 4. Categorías e Ítems
CREATE TABLE IF NOT EXISTS categorias_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prefijo VARCHAR(10) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('equipo', 'mobiliario', 'insumo') DEFAULT 'insumo',
    stock_minimo INT DEFAULT 5,
    descripcion TEXT
);

INSERT INTO categorias_inventario (prefijo, nombre, tipo, stock_minimo) VALUES 
('LAP', 'Laptops / Notebooks', 'equipo', 3),
('SIL', 'Sillas y Asientos', 'mobiliario', 10),
('PAP', 'Papelería y Útiles', 'insumo', 20);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    categoria_inventario_id INT,
    stock_minimo INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unidad_medida VARCHAR(50) DEFAULT 'Unidad',
    unidad_compra VARCHAR(50) DEFAULT 'Unidad',
    factor_conversion DECIMAL(10,2) DEFAULT 1.00,
    FOREIGN KEY (categoria_inventario_id) REFERENCES categorias_inventario(id)
);

-- 5. Personal y Ubicaciones
CREATE TABLE IF NOT EXISTS personal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(15) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    cargo VARCHAR(100),
    area_id INT,
    email VARCHAR(100),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    FOREIGN KEY (area_id) REFERENCES areas(id)
);

CREATE TABLE IF NOT EXISTS ubicaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50),
    pabellon VARCHAR(50),
    piso INT,
    sede_id INT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    FOREIGN KEY (sede_id) REFERENCES sedes(id)
);

CREATE TABLE IF NOT EXISTS ubicaciones_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ubicacion_id INT NOT NULL,
    nombre VARCHAR(100) NULL,
    tipo VARCHAR(50) NULL,
    responsable_id INT NULL,
    fecha_desde DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_hasta DATETIME NULL,
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (responsable_id) REFERENCES personal(id) ON DELETE SET NULL
);


-- 6. Activos (Ítems individualizados)
CREATE TABLE IF NOT EXISTS activos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_serie VARCHAR(100) UNIQUE,
    codigo_interno VARCHAR(50) UNIQUE,
    item_id INT NOT NULL,
    ubicacion_id INT,
    personal_id INT,
    estado VARCHAR(50) DEFAULT 'Operativo',
    observaciones_tecnicas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
    FOREIGN KEY (personal_id) REFERENCES personal(id)
);

CREATE TABLE IF NOT EXISTS rubros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruc VARCHAR(11) UNIQUE,
    razon_social VARCHAR(150) NOT NULL,
    rubro_id INT,
    direccion TEXT,
    contacto VARCHAR(100),
    email VARCHAR(100),
    telefono VARCHAR(50),
    banco VARCHAR(100),
    numero_cuenta VARCHAR(100),
    cci VARCHAR(100),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    FOREIGN KEY (rubro_id) REFERENCES rubros(id) ON DELETE SET NULL
);

-- 8. Movimientos y Stock
CREATE TABLE IF NOT EXISTS movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    tipo ENUM('Entrada', 'Salida', 'Baja') NOT NULL,
    cantidad INT NOT NULL,
    ubicacion_id INT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
);

-- 9. Adquisiciones (OC / OS)
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_oc VARCHAR(20) UNIQUE,
    tipo ENUM('compra', 'servicio') DEFAULT 'compra',
    proveedor_id INT NOT NULL,
    activo_id INT,
    creado_por INT,
    fecha DATE,
    fecha_requerida DATE,
    fecha_recepcion DATETIME,
    area_id INT,
    moneda VARCHAR(5) DEFAULT 'PEN',
    subtotal DECIMAL(12,2),
    igv DECIMAL(12,2),
    total DECIMAL(12,2),
    monto DECIMAL(12,2),
    condicion_pago VARCHAR(50),
    condicion_detalle TEXT,
    estado ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Recibida', 'Completada') DEFAULT 'Pendiente',
    aprobado_gerente TINYINT(1) DEFAULT 0,
    aprobado_finanzas TINYINT(1) DEFAULT 0,
    rechazado_gerente TINYINT(1) DEFAULT 0,
    rechazado_finanzas TINYINT(1) DEFAULT 0,
    pagado TINYINT(1) DEFAULT 0,
    voucher_url TEXT,
    pdf_oc_url TEXT,
    pdf_mov_url TEXT,
    conformidad_url TEXT,
    comprobante_url TEXT,
    stock_actualizado TINYINT(1) DEFAULT 0,
    observaciones TEXT,
    dentro_presupuesto TINYINT(1) DEFAULT 1,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS ordenes_compra_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_id INT NOT NULL,
    item_id INT,
    categoria_nombre VARCHAR(100),
    prefijo VARCHAR(10),
    descripcion TEXT,
    unidad VARCHAR(50) DEFAULT 'Unidad',
    cantidad INT,
    precio_unitario DECIMAL(12,2),
    total DECIMAL(12,2),
    factor_conversion DECIMAL(10,2) DEFAULT 1.00,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id)
);

CREATE TABLE IF NOT EXISTS ordenes_cuotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_id INT NOT NULL,
    numero_cuota INT,
    total_cuotas INT,
    monto_cuota DECIMAL(12,2),
    fecha_vencimiento DATE,
    pagado TINYINT(1) DEFAULT 0,
    fecha_pago DATETIME,
    voucher_url TEXT,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id)
);

CREATE TABLE IF NOT EXISTS ordenes_compra_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_id INT NOT NULL,
    token VARCHAR(100) UNIQUE,
    rol VARCHAR(50),
    usado TINYINT(1) DEFAULT 0,
    expiracion DATETIME,
    FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id)
);

-- 10. Mantenimientos
CREATE TABLE IF NOT EXISTS mantenimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NOT NULL,
    item_id INT,
    proveedor_id INT,
    orden_compra_id INT,
    tipo ENUM('Preventivo', 'Correctivo') DEFAULT 'Correctivo',
    estado VARCHAR(50),
    fecha_inicio DATE,
    fecha_fin DATE,
    costo DECIMAL(12,2),
    descripcion_problema TEXT,
    descripcion_solucion TEXT,
    FOREIGN KEY (activo_id) REFERENCES activos(id),
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id)
);

-- 11. Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(150),
    mensaje TEXT,
    tipo ENUM('info', 'success', 'warning', 'danger', 'error') DEFAULT 'info',
    leido TINYINT(1) DEFAULT 0,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

SET FOREIGN_KEY_CHECKS = 1;
