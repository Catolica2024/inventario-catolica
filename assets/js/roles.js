window.ROLES = [
  { id: 'admin',           label: 'Administrador',     description: 'Acceso total al sistema' },
  { id: 'gerente_general', label: 'Gerente General',   description: 'Aprobación de compras y reportes' },
  { id: 'jefe_finanzas',   label: 'Jefe de Finanzas',  description: 'Aprobación financiera y reportes' },
  { id: 'almacenero',      label: 'Almacenero',        description: 'Gestión de almacén e insumos' },
  { id: 'comprador',       label: 'Comprador',         description: 'Gestión de compras y proveedores' },
  { id: 'tesoreria',       label: 'Tesorería',         description: 'Gestión de pagos y vouchers' },
  { id: 'personal',        label: 'Personal',          description: 'Consulta de inventario' },
];

window.ROLE_PERMISSIONS = {
  admin:           ['*'],
  gerente_general: ['dashboard', 'notifications', 'search', 'inventory', 'approvals', 'reports', 'history'],
  jefe_finanzas:   ['dashboard', 'notifications', 'search', 'inventory', 'approvals', 'reports', 'history'],
  almacenero:      ['dashboard','notifications','search','inventory','assets','categories','locations','areas','movements','maintenance','add-item','new-purchase','history'],
  comprador:       ['dashboard','notifications','search','suppliers','categories','purchases','new-purchase','recepcions','areas','history','documents'],
  tesoreria:       ['dashboard','notifications','search','inventory','treasury','history'],
  personal:        ['dashboard','search','inventory','notifications'],
};

window.MODULES_LIST = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'notifications', label: 'Notificaciones' },
  { id: 'registration',  label: 'Registrar Bien' },
  { id: 'inventory',     label: 'Inventario General' },
  { id: 'categories-inv',label: 'Categorías' },
  { id: 'assignments',   label: 'Asignaciones' },
  { id: 'transfers',     label: 'Traslados' },
  { id: 'dispatch',      label: 'Despacho Insumos' },
  { id: 'maintenance',   label: 'Mantenimiento' },
  { id: 'purchases',     label: 'Órdenes de Compra' },
  { id: 'recepcions',    label: 'Recepciones' },
  { id: 'suppliers',     label: 'Proveedores' },
  { id: 'approvals',     label: 'Aprobaciones' },
  { id: 'treasury',      label: 'Tesorería / Pagos' },
  { id: 'staff',         label: 'Personal' },
  { id: 'locations',     label: 'Aulas y Espacios' },
  { id: 'areas',         label: 'Áreas / Niveles' },
  { id: 'users',         label: 'Usuarios del Sistema' },
  { id: 'settings',      label: 'Configuración' }
];

window.canAccess = function(user, sectionId) {
  if (!user) return false;
  
  // EL ADMIN SIEMPRE TIENE ACCESO (Regla de oro del Arquitecto)
  if (user.role === 'admin') return true;
  
  let perms = [];
  
  // Cargar permisos del rol
  const rolePerms = window.ROLE_PERMISSIONS[user.role] || [];
  perms = [...rolePerms];

  // Mezclar con permisos personalizados si existen
  if (user.permissions) {
    const customPerms = user.permissions.split(',').map(p => p.trim());
    perms = [...perms, ...customPerms];
  }

  return perms.includes('*') || perms.includes(sectionId);
};

window.canEdit = function(role) {
  return role === 'admin' || role === 'almacenero' || role === 'comprador';
};
