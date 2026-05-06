window.Views = window.Views || {};

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/users.php').then(r => r.json());
    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-muted-foreground">No hay usuarios registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td class="font-medium">${u.nombre}</td>
        <td class="text-muted-foreground text-sm">${u.email}</td>
        <td><span class="badge badge-blue">${u.rol_nombre}</span></td>
        <td><span class="badge ${u.estado === 'activo' ? 'badge-green' : 'badge-red'}">${u.estado}</span></td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editUser(${u.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteUser(${u.id}, '${u.nombre.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

function userFormHTML(u, roles, isNew) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div><label class="text-sm font-medium">Nombre completo <span class="text-destructive">*</span></label>
        <input id="usr-nombre" class="input mt-1 w-full" placeholder="Juan Pérez" value="${u ? u.nombre : ''}"></div>
      <div><label class="text-sm font-medium">Email <span class="text-destructive">*</span></label>
        <input id="usr-email" type="email" class="input mt-1 w-full" placeholder="usuario@catolica.edu" value="${u ? u.email : ''}"></div>
      <div><label class="text-sm font-medium">${isNew ? 'Contraseña <span class="text-destructive">*</span>' : 'Nueva contraseña <span class="text-xs text-muted-foreground">(vacío = no cambiar)</span>'}</label>
        <input id="usr-pass" type="password" class="input mt-1 w-full" placeholder="••••••••"></div>
      <div><label class="text-sm font-medium">Rol <span class="text-destructive">*</span></label>
        <select id="usr-rol" class="select mt-1 w-full">
          ${roles.map(r => `<option value="${r.id}" ${u && u.rol_id == r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Estado</label>
        <select id="usr-estado" class="select mt-1 w-full">
          <option value="activo" ${!u || u.estado === 'activo' ? 'selected' : ''}>Activo</option>
          <option value="inactivo" ${u && u.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
        </select></div>
    </div>`;
}

async function openUserModal(uData) {
  const data = await fetch('api/users.php').then(r => r.json()).catch(() => ({ roles: [] }));
  const isNew = !uData;
  UI.modal({
    title: isNew ? 'Nuevo usuario' : 'Editar usuario',
    body: userFormHTML(uData, data.roles, isNew),
    confirmText: isNew ? 'Crear usuario' : 'Guardar cambios',
    onConfirm: async () => {
      const nombre = document.getElementById('usr-nombre').value.trim();
      const email = document.getElementById('usr-email').value.trim();
      const password = document.getElementById('usr-pass').value;
      const rol_id = document.getElementById('usr-rol').value;
      if (!nombre || !email || !rol_id) { UI.toast('Nombre, email y rol son obligatorios', 'error'); return; }
      if (isNew && !password) { UI.toast('La contraseña es obligatoria para nuevo usuario', 'error'); return; }
      const body = { nombre, email, password, rol_id, estado: document.getElementById('usr-estado').value };
      if (uData) body.id = uData.id;
      const resp = await fetch('api/users.php', { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const res = await resp.json();
      if (res.ok) { UI.toast(isNew ? 'Usuario creado' : 'Usuario actualizado', 'success'); loadUsers(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
}

window.newUser = () => openUserModal(null);
window.editUser = async function(id) {
  const data = await fetch('api/users.php').then(r => r.json());
  const u = data.users.find(x => x.id == id);
  if (u) openUserModal(u);
};
window.deleteUser = function(id, nombre) {
  UI.modal({ title: 'Eliminar usuario', body: `<p>¿Eliminar al usuario <strong>${nombre}</strong>? Esta acción no se puede deshacer.</p>`, confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/users.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Usuario eliminado', 'success'); loadUsers(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.users = function() {
  return `
    ${UI.pageHeader('Usuarios y Roles','Gestión de accesos al sistema', `
      <button class="btn btn-primary" onclick="newUser()"><i data-lucide="user-plus"></i>Nuevo usuario</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="users-table-body"><tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.users.afterMount = loadUsers;
