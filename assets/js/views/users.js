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
      <tr class="${u.estado === 'inactivo' ? 'bg-muted/30' : ''}">
        <td class="font-medium ${u.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">
          <div>${u.nombre}</div>
          ${u.personal_nombre ? `<div class="text-[10px] text-muted-foreground italic">Vínculo: ${u.personal_nombre}</div>` : ''}
        </td>
        <td class="text-muted-foreground text-sm ${u.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${u.email}</td>
        <td class="${u.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">
          <span class="badge badge-blue">${u.rol_nombre}</span>
          ${u.permisos ? '<span class="badge badge-orange ml-1 text-[8px]">Personalizado</span>' : ''}
        </td>
        <td class="${u.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}"><span class="badge ${u.estado === 'activo' ? 'badge-green' : 'badge-red'}">${u.estado}</span></td>
        <td class="text-right whitespace-nowrap">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5 ${u.estado === 'activo' ? 'text-destructive' : 'text-green-500'}" 
                    title="${u.estado === 'activo' ? 'Dar de baja' : 'Activar'}" 
                    onclick="toggleUserStatus(${u.id}, '${u.estado}', '${u.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="${u.estado === 'activo' ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 ${u.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Editar" onclick="editUser(${u.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 text-destructive ${u.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Eliminar" onclick="deleteUser(${u.id}, '${u.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

function userFormHTML(u, roles, staff, isNew) {
  const userPerms = u && u.permisos ? u.permisos.split(',') : [];
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <h3 class="text-xs font-bold text-primary uppercase border-b pb-1">Información de Acceso</h3>
        <div><label class="text-sm font-medium">Nombre completo <span class="text-destructive">*</span></label>
          <input id="usr-nombre" class="input mt-1 w-full" placeholder="Juan Pérez" value="${u ? u.nombre : ''}"></div>
        <div><label class="text-sm font-medium">Email <span class="text-destructive">*</span></label>
          <input id="usr-email" type="email" class="input mt-1 w-full" placeholder="usuario@catolica.edu" value="${u ? u.email : ''}"></div>
        <div><label class="text-sm font-medium">${isNew ? 'Contraseña <span class="text-destructive">*</span>' : 'Nueva contraseña <span class="text-xs text-muted-foreground">(vacío = no cambiar)</span>'}</label>
          <input id="usr-pass" type="password" class="input mt-1 w-full" placeholder="••••••••"></div>
        <div><label class="text-sm font-medium">Vincular con Personal <span class="text-xs text-muted-foreground">(Opcional)</span></label>
          <select id="usr-personal" class="select mt-1 w-full">
            <option value="">Ninguno</option>
            ${staff.map(p => `<option value="${p.id}" ${u && u.personal_id == p.id ? 'selected' : ''}>${p.nombre} (${p.cargo})</option>`).join('')}
          </select></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-sm font-medium">Rol Base</label>
            <select id="usr-rol" class="select mt-1 w-full">
              ${roles.map(r => `<option value="${r.id}" ${u && u.rol_id == r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}
            </select></div>
          <div><label class="text-sm font-medium">Estado</label>
            <select id="usr-estado" class="select mt-1 w-full">
              <option value="activo" ${!u || u.estado === 'activo' ? 'selected' : ''}>Activo</option>
              <option value="inactivo" ${u && u.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
            </select></div>
        </div>
      </div>
      
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-primary uppercase border-b pb-1">Módulos Habilitados</h3>
        <p class="text-[10px] text-muted-foreground">Si no selecciona nada, se usarán los permisos por defecto del Rol Base.</p>
        <div class="max-h-[300px] overflow-y-auto pr-2 grid grid-cols-1 gap-1">
          ${window.MODULES_LIST.map(m => `
            <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
              <input type="checkbox" class="checkbox checkbox-sm" name="usr-perm" value="${m.id}" ${userPerms.includes(m.id) ? 'checked' : ''}>
              <span class="text-xs font-medium">${m.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>`;
}

async function openUserModal(uData) {
  const data = await fetch('api/users.php').then(r => r.json()).catch(() => ({ roles: [] }));
  const isNew = !uData;
  UI.modal({
    title: isNew ? 'Nuevo usuario' : 'Editar usuario',
    size: 'lg',
    body: userFormHTML(uData, data.roles, data.staff, isNew),
    confirmText: isNew ? 'Crear usuario' : 'Guardar cambios',
    onConfirm: async () => {
      const nombre = document.getElementById('usr-nombre').value.trim();
      const email = document.getElementById('usr-email').value.trim();
      const password = document.getElementById('usr-pass').value;
      const rol_id = document.getElementById('usr-rol').value;
      
      const selectedPerms = Array.from(document.querySelectorAll('input[name="usr-perm"]:checked')).map(cb => cb.value);
      
      if (!nombre || !email || !rol_id) { UI.toast('Nombre, email y rol son obligatorios', 'error'); return false; }
      if (isNew && !password) { UI.toast('La contraseña es obligatoria para nuevo usuario', 'error'); return false; }
      
      const body = { 
        nombre, 
        email, 
        password, 
        rol_id, 
        personal_id: document.getElementById('usr-personal').value || null,
        permisos: selectedPerms.length > 0 ? selectedPerms.join(',') : null,
        estado: document.getElementById('usr-estado').value 
      };
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
window.toggleUserStatus = async function(id, currentStatus, name) {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    const action = newStatus === 'activo' ? 'activar' : 'dar de baja';
    
    UI.modal({
        title: `${newStatus === 'activo' ? 'Activar' : 'Dar de baja'} Usuario`,
        body: `<p>¿Está seguro de que desea <strong>${action}</strong> al usuario <strong>${name}</strong>?</p>
               ${newStatus === 'inactivo' ? '<p class="text-xs text-destructive mt-2 font-bold">⚠️ El usuario perderá el acceso al sistema inmediatamente.</p>' : ''}`,
        confirmText: `Sí, ${action}`,
        onConfirm: async () => {
            UI.loading('Actualizando estado...');
            try {
                const data = await fetch('api/users.php').then(r => r.json());
                const u = data.users.find(x => x.id == id);
                if (!u) throw new Error('Usuario no encontrado');

                const body = { ...u, estado: newStatus };
                const res = await fetch('api/users.php', { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(body) 
                }).then(r => r.json());

                UI.stopLoading();
                if (res.ok) {
                    UI.toast(`Usuario ${newStatus === 'activo' ? 'activado' : 'dado de baja'}`, 'success');
                    loadUsers();
                } else {
                    UI.toast('Error: ' + res.error, 'error');
                }
            } catch (e) {
                UI.stopLoading();
                UI.toast('Error al actualizar estado', 'error');
            }
        }
    });
};

window.Views.users.afterMount = loadUsers;
