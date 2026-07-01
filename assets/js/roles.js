window.ROLES = [
  { id: 'admin', label: 'Administrador', description: 'Acceso total al sistema' },
  { id: 'gerente_general', label: 'Gerente General', description: 'Aprobación de compras y reportes' },
  { id: 'jefe_finanzas', label: 'Jefe de Finanzas', description: 'Aprobación financiera y reportes' },
  { id: 'almacenero', label: 'Almacenero', description: 'Gestión de almacén e insumos' },
  { id: 'comprador', label: 'Comprador', description: 'Gestión de compras y proveedores' },
  { id: 'tesoreria', label: 'Tesorería', description: 'Gestión de pagos y vouchers' },
  { id: 'contabilidad', label: 'Contabilidad', description: 'Consulta de pagos y estado financiero' },
  { id: 'personal', label: 'Personal', description: 'Consulta de inventario' },
  { id: 'jefe_area', label: 'Jefe de Área', description: 'Gestión y creación de requisiciones' },
  { id: 'req_pedagogia', label: 'Jefe Pedagogía (Sub-área)', description: 'Jefe de sub-área de pedagogía, requiere firma de Dirección' },
];

// MÓDULOS SENSIBLES: Requieren asignación explícita del Admin.
// El dashboard muestra KPIs financieros y operativos estratégicos.
window.SENSITIVE_MODULES = ['dashboard'];

window.ROLE_PERMISSIONS = {
  admin: ['*'],
  gerente_general: ['notifications', 'search', 'inventory', 'approvals', 'reports', 'history'],
  jefe_finanzas: ['notifications', 'search', 'inventory', 'approvals', 'reports', 'history'],
  almacenero: ['notifications', 'search', 'inventory', 'assets', 'categories', 'locations', 'areas', 'movements', 'maintenance', 'add-item', 'new-purchase', 'history'],
  comprador: ['notifications', 'search', 'suppliers', 'categories', 'purchases', 'new-purchase', 'edit-purchase', 'recepcions', 'areas', 'history', 'documents', 'requisitions'],
  tesoreria: ['notifications', 'search', 'inventory', 'treasury', 'history'],
  contabilidad: ['notifications', 'search', 'treasury', 'history'],
  personal: ['search', 'inventory', 'notifications'],
  jefe_area: ['notifications', 'search', 'requisitions', 'new-requisition'],
  req_pedagogia: ['notifications', 'search', 'requisitions', 'new-requisition'],
};

window.MODULES_LIST = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notifications', label: 'Notificaciones' },
  { id: 'requisitions', label: 'Requisiciones' },
  { id: 'registration', label: 'Registrar Bien' },
  { id: 'inventory', label: 'Inventario General' },
  { id: 'categories-inv', label: 'Categorías' },
  { id: 'assignments', label: 'Asignaciones' },
  { id: 'transfers', label: 'Traslados' },
  { id: 'dispatch', label: 'Despacho Insumos' },
  { id: 'maintenance', label: 'Mantenimiento' },
  { id: 'purchases', label: 'Órdenes de Compra' },
  { id: 'recepcions', label: 'Recepciones' },
  { id: 'suppliers', label: 'Proveedores' },
  { id: 'rubros', label: 'Rubros de Proveedores' },
  { id: 'approvals', label: 'Aprobaciones' },
  { id: 'treasury', label: 'Tesorería / Pagos' },
  { id: 'staff', label: 'Personal' },
  { id: 'locations', label: 'Aulas y Espacios' },
  { id: 'areas', label: 'Áreas / Niveles' },
  { id: 'users', label: 'Usuarios del Sistema' },
  { id: 'settings', label: 'Configuración' }
];

window.canAccess = function (user, sectionId) {
  if (!user) return false;

  // EL ADMIN SIEMPRE TIENE ACCESO (Regla de oro del Arquitecto)
  if (user.role === 'admin') return true;

  // MÓDULOS SENSIBLES: Solo accesibles si el Admin los asignó explícitamente.
  // Se ignoran los permisos base del rol para estos módulos.
  if (window.SENSITIVE_MODULES && window.SENSITIVE_MODULES.includes(sectionId)) {
    if (!user.permissions) return false;
    const customPerms = user.permissions.split(',').map(p => p.trim());
    return customPerms.includes(sectionId);
  }

  let perms = [];

  // Cargar permisos del rol base
  const rolePerms = window.ROLE_PERMISSIONS[user.role] || [];
  perms = [...rolePerms];

  // Mezclar con permisos personalizados si existen
  if (user.permissions) {
    const customPerms = user.permissions.split(',').map(p => p.trim());
    perms = [...perms, ...customPerms];
  }

  return perms.includes('*') || perms.includes(sectionId);
};

window.canEdit = function (role) {
  return role === 'admin' || role === 'almacenero' || role === 'comprador';
};

window.canDelete = function (user) {
  if (!user) return false;
  // El admin siempre tiene la potestad, o el perfil habilitado por el admin
  return user.role === 'admin' || user.can_delete == 1;
};
