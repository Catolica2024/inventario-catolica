# Católica School — Sistema de Gestión de Inventario

Sistema profesional de gestión de activos, inventario de consumibles y control de adquisiciones para la institución educativa Católica School.

## 🛠️ Arquitectura Técnica

- **Frontend**: HTML5 + Vanilla JavaScript (Arquitectura modular por vistas).
- **Estilos**: Tailwind CSS 3.4 (Compilado vía CLI para máxima optimización).
- **Backend**: PHP 7.4+ (Arquitectura RESTful con PDO MySQL).
- **Seguridad**: Autenticación real basada en roles y contraseñas hasheadas (bcrypt).

## 📁 Estructura del Proyecto

```
inventario-catolica/
├── index.html               # Punto de entrada principal (SPA)
├── assets/
│   ├── css/
│   │   ├── input.css        # Código fuente de estilos Tailwind
│   │   └── styles.css       # CSS compilado y minificado para producción
│   └── js/
│       ├── auth.js          # Manejo de sesión y seguridad
│       ├── roles.js         # Configuración de RBAC (Role-Based Access Control)
│       ├── router.js        # Motor de navegación dinámica
│       ├── components.js    # Componentes UI reutilizables
│       ├── app.js           # Inicialización de la aplicación
│       └── views/           # Módulos funcionales (Dashboard, Inventario, Compras, etc.)
├── api/                     # Endpoints de la API REST en PHP
├── includes/
│   ├── db.php               # Singleton de conexión a base de datos y utilidades JSON
│   └── mailer.php           # Motor de notificaciones por correo electrónico
└── package.json             # Scripts de compilación (Tailwind CLI)
```

## 🚀 Despliegue y Desarrollo

### Compilación de Estilos
El sistema utiliza Tailwind CLI. Para generar el CSS de producción:
```bash
npm run build
```

Para desarrollo con recarga automática de estilos:
```bash
npm run watch
```

### Configuración de Base de Datos
1. Crear una base de datos MySQL (ej: `catolica_school`).
2. Ejecutar el script `schema.sql` para crear la estructura de tablas y datos iniciales.
3. Editar `includes/db.php` con las credenciales de su servidor local (XAMPP/WAMP/Laragon).

## 🔐 Gestión de Accesos
El acceso está restringido por roles. Los roles disponibles son:
- **admin**: Acceso total y gestión de usuarios.
- **gerente_general**: Reportes y aprobaciones de alto nivel.
- **jefe_finanzas**: Gestión presupuestaria y financiera.
- **almacenero**: Control físico de ingresos y salidas.
- **comprador**: Operativa de proveedores y órdenes de compra.
- **personal**: Consultas básicas y solicitudes.

---
© 2024 Católica School · Área de Tecnología e Infraestructura.
