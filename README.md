# Católica School — Sistema de Gestión de Inventario

Proyecto migrado a **HTML + Tailwind (CDN) + JavaScript vainilla**, con stubs de **PHP** preparados para conectar a una base de datos MySQL/MariaDB.

## 📁 Estructura

```
catolica-school/
├── index.html               # Punto de entrada (carga app + Tailwind CDN)
├── assets/
│   ├── css/styles.css       # Estilos personalizados (tokens institucionales)
│   └── js/
│       ├── auth.js          # Manejo de sesión (localStorage)
│       ├── roles.js         # Definición de roles y permisos
│       ├── router.js        # Router por hash (#dashboard, #inventory, ...)
│       ├── components.js    # Helpers UI (toast, modal, headers)
│       ├── app.js           # Bootstrap + sidebar + header
│       └── views/           # Una vista por sección
├── api/                     # Endpoints PHP (stubs listos para conectar a BD)
│   ├── auth.php
│   └── items.php
└── includes/
    └── db.php               # Conexión PDO (MySQL/MariaDB)
```

## 🚀 Cómo ejecutar

### Opción A — Solo frontend (sin PHP)
Abre `index.html` directamente en el navegador o con cualquier servidor estático:
```bash
npx serve .
# o
python3 -m http.server 8080
```

### Opción B — Con PHP (para conectar la BD real)
Requiere PHP 7.4+ y MySQL.
```bash
php -S localhost:8080
```
Luego abre http://localhost:8080

## 🔐 Login

El selector de rol fue **eliminado**. El rol del usuario se asigna desde el backend (tabla `usuarios`) y el **superadministrador** lo gestiona desde la sección **Usuarios y Roles**.

> En esta demo (sin BD), `auth.js` asigna el rol según el correo:
> `admin@…` → admin · `gerente@…` → gerente_general · `finanzas@…` → jefe_finanzas · `almacen@…` → almacenero · `compras@…` → comprador · cualquier otro → personal.

Cuando conectes el backend PHP, edita `assets/js/auth.js` para llamar a `api/auth.php` y eliminar la simulación.

## 🎨 Identidad visual

- **Azul institucional:** `#1b5cff`
- **Cian:** `#36a2bc`
- **Amarillo:** `#f4da40`
- Tipografía: **Inter** (Google Fonts)

## 🗄️ Base de datos

Edita `includes/db.php` con tus credenciales. El esquema esperado incluye las tablas:
`categorias`, `items`, `activos`, `lotes`, `ubicaciones`, `proveedores`, `personal`, `cargos`, `asignaciones`, `movimientos`, `mantenimientos`, `ordenes_compra`, `detalle_ordenes`, `usuarios`, `roles`, `permisos`.

## 📦 Próximos pasos sugeridos

1. Crear el esquema SQL en MySQL.
2. Reemplazar los datos demo en cada vista (`assets/js/views/*.js`) por llamadas `fetch('api/...')`.
3. Implementar los endpoints PHP restantes siguiendo el patrón de `api/items.php`.
4. (Opcional) Compilar Tailwind en producción en lugar del CDN.
