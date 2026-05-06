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
  almacenero:      ['dashboard','notifications','search','inventory','assets','categories','locations','movements','maintenance','add-item','history'],
  comprador:       ['dashboard','notifications','search','suppliers','purchases','history','documents'],
  tesoreria:       ['dashboard','notifications','search','inventory','treasury','history'],
  personal:        ['dashboard','search','inventory','notifications'],
};

window.canAccess = function(role, sectionId) {
  const perms = window.ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(sectionId);
};

window.canEdit = function(role) {
  return role === 'admin' || role === 'almacenero' || role === 'comprador';
};
