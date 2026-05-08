-- Crear base de datos
CREATE DATABASE IF NOT EXISTS catolica_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE catolica_school;

-- 1. Roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

INSERT INTO roles (nombre, descripcion) VALUES 
('admin', 'Superadministrador con acceso total'),
('gerente_general', 'Supervisión y reportes globales'),
('jefe_finanzas', 'Control de presupuestos y órdenes de compra'),
('almacenero', 'Gestión de stock y movimientos'),
('comprador', 'Gestión de proveedores y adquisiciones'),
('personal', 'Consulta y solicitud de activos');

-- 2. Usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Usuario por defecto: admin@catolica.edu / password: admin123
INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES 
('Administrador Sistema', 'admin@catolica.edu', '$2y$10$Zf/c5Zt9dv4OICPCvAsCJ.6tNLCZvNdamQk1euspaXbi.AxnSPuQW', 1);

-- 3. Categorías
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

INSERT INTO categorias (codigo, nombre, descripcion) VALUES 
('CAT-01', 'Tecnología', 'Equipos electrónicos y de cómputo'),
('CAT-02', 'Mobiliario', 'Sillas, mesas y muebles'),
('CAT-03', 'Limpieza', 'Insumos y productos de limpieza'),
('CAT-04', 'Deportes', 'Material deportivo y recreativo');

-- 4. Ítems (Catálogo)
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    categoria_id INT,
    ficha_tecnica TEXT,
    stock_minimo INT DEFAULT 0,
    imagen VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

INSERT INTO items (codigo, nombre, marca, modelo, categoria_id, stock_minimo) VALUES 
('ITM-001', 'Laptop Lenovo ThinkPad', 'Lenovo', 'X1 Carbon', 1, 5),
('ITM-002', 'Silla escolar madera', 'Muebles SAC', 'Estándar', 2, 20),
('ITM-003', 'Detergente líquido 1L', 'Sapolio', 'Limpieza Total', 3, 10);

-- 5. Personal
CREATE TABLE personal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(15) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    cargo VARCHAR(100),
    area VARCHAR(100),
    telefono VARCHAR(20)
);

INSERT INTO personal (dni, nombre, cargo, area) VALUES 
('45123789', 'Mariela Salazar', 'Docente', 'Secundaria'),
('41234567', 'Ricardo Torres', 'Coordinador TI', 'Tecnología');

-- 6. Ubicaciones
CREATE TABLE ubicaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50),
    responsable_id INT,
    FOREIGN KEY (responsable_id) REFERENCES personal(id)
);

INSERT INTO ubicaciones (codigo, nombre, tipo, responsable_id) VALUES 
('UB-001', 'Aula 201', 'Aula', 1),
('UB-002', 'Laboratorio Cómputo 1', 'Laboratorio', 2);

-- 7. Activos (Ítems individualizados)
CREATE TABLE activos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_serie VARCHAR(50) UNIQUE,
    item_id INT NOT NULL,
    ubicacion_id INT,
    estado ENUM('Operativo', 'Mantenimiento', 'Baja', 'Reparación') DEFAULT 'Operativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
);

INSERT INTO activos (numero_serie, item_id, ubicacion_id, estado) VALUES 
('L-204', 1, 2, 'Operativo'),
('P-051', 1, 2, 'Mantenimiento');

-- 8. Proveedores
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruc VARCHAR(11) UNIQUE,
    razon_social VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    categoria_id INT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

INSERT INTO proveedores (ruc, razon_social, contacto, telefono, categoria_id) VALUES 
('20512345678', 'Tecno Perú SAC', 'Luis Mendoza', '987654321', 1);

-- 9. Movimientos (Consumibles)
CREATE TABLE movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    cantidad INT NOT NULL,
    responsable_id INT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (responsable_id) REFERENCES personal(id)
);

-- 10. Mantenimientos
CREATE TABLE mantenimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activo_id INT NOT NULL,
    tipo ENUM('Preventivo', 'Correctivo') NOT NULL,
    tecnico VARCHAR(100),
    estado ENUM('Programado', 'En proceso', 'Completado') DEFAULT 'Programado',
    fecha_inicio DATE,
    fecha_fin DATE,
    observacion TEXT,
    FOREIGN KEY (activo_id) REFERENCES activos(id)
);

-- 11. Órdenes de Compra
CREATE TABLE ordenes_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_oc VARCHAR(20) UNIQUE,
    proveedor_id INT NOT NULL,
    fecha DATE,
    monto DECIMAL(10,2),
    estado ENUM('Pendiente', 'Aprobada', 'Rechazada') DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);
