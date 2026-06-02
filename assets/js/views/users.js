window.Views = window.Views || {};

window.togglePassVisibility = function() {
  const passInput = document.getElementById('usr-pass');
  const icon = document.getElementById('toggle-pass-icon');
  if (passInput) {
    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (icon) {
        icon.setAttribute('data-lucide', 'eye-off');
        lucide.createIcons();
      }
    } else {
      passInput.type = 'password';
      if (icon) {
        icon.setAttribute('data-lucide', 'eye');
        lucide.createIcons();
      }
    }
  }
};

window.generateUserPass = function() {
  const passInput = document.getElementById('usr-pass');
  if (passInput) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?";
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const specs = "!@#$%&*?";
    
    let pass = "";
    pass += lowers.charAt(Math.floor(Math.random() * lowers.length));
    pass += uppers.charAt(Math.floor(Math.random() * uppers.length));
    pass += nums.charAt(Math.floor(Math.random() * nums.length));
    pass += specs.charAt(Math.floor(Math.random() * specs.length));
    
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    passInput.value = pass;
    passInput.type = 'text';
    
    const icon = document.getElementById('toggle-pass-icon');
    if (icon) {
      icon.setAttribute('data-lucide', 'eye-off');
      lucide.createIcons();
    }
    
    UI.toast('Contraseña segura generada', 'success');
  }
};

// Parsear permisos del usuario como array
function parsePerms(permisos) {
  if (!permisos) return [];
  return permisos.split(',').map(p => p.trim()).filter(Boolean);
}

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/users.php').then(r => r.json());
    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay usuarios registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(u => {
      const permsArr = parsePerms(u.permisos);
      const hasDashboard = permsArr.includes('dashboard');
      const isAdmin = u.rol_nombre === 'admin';
      const isInactive = u.estado === 'inactivo';
      return `
      <tr class="${isInactive ? 'bg-muted/30' : ''}">
        <td class="font-medium ${isInactive ? 'opacity-50 grayscale' : ''}">
          <div>${u.nombre}</div>
          ${u.personal_nombre ? `<div class="text-[10px] text-muted-foreground italic">Vínculo: ${u.personal_nombre}</div>` : ''}
        </td>
        <td class="text-muted-foreground text-sm ${isInactive ? 'opacity-50 grayscale' : ''}">${u.email}</td>
        <td class="${isInactive ? 'opacity-50 grayscale' : ''}">
          <span class="badge badge-blue">${u.rol_nombre}</span>
          ${u.permisos ? '<span class="badge badge-orange ml-1 text-[8px]">Personalizado</span>' : ''}
        </td>
        <td class="${isInactive ? 'opacity-50 grayscale' : ''}">
          <span class="badge ${u.estado === 'activo' ? 'badge-green' : 'badge-red'}">${u.estado}</span>
        </td>

        <!-- TOGGLE DASHBOARD -->
        <td class="text-center">
          ${isAdmin
            ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wide">
                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>Siempre
               </span>`
            : `<button
                  id="dash-toggle-${u.id}"
                  onclick="toggleDashboard(${u.id}, '${u.nombre.replace(/'/g, "\\'")}', ${hasDashboard})"
                  class="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200
                         ${hasDashboard
                           ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                           : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'}
                         ${isInactive ? 'opacity-40 pointer-events-none' : ''}"
                  title="${hasDashboard ? 'Revocar acceso al Dashboard' : 'Conceder acceso al Dashboard'}">
                  <span class="w-2 h-2 rounded-full ${hasDashboard ? 'bg-primary' : 'bg-slate-300'}"></span>
                  ${hasDashboard ? 'Habilitado' : 'Deshabilitado'}
               </button>`
          }
        </td>

        <td class="text-right whitespace-nowrap">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5 ${isInactive ? 'text-green-500' : 'text-destructive'}"
                    title="${isInactive ? 'Activar' : 'Dar de baja'}"
                    onclick="toggleUserStatus(${u.id}, '${u.estado}', '${u.nombre.replace(/'/g, "\\'")}')"
            ><i data-lucide="${isInactive ? 'user-check' : 'user-x'}" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 ${isInactive ? 'opacity-50 grayscale' : ''}" title="Editar" onclick="editUser(${u.id})">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 text-destructive ${isInactive ? 'opacity-50 grayscale' : ''}" title="Eliminar" onclick="deleteUser(${u.id}, '${u.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
    lucide.createIcons();
  } catch(e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

// Toggle acceso al Dashboard sin abrir modal de edición completa
window.toggleDashboard = async function(userId, userName, currentlyEnabled) {
  const action = currentlyEnabled ? 'revocar' : 'conceder';
  const icon   = currentlyEnabled ? '🔒' : '📊';

  UI.modal({
    title: `${icon} ${currentlyEnabled ? 'Revocar' : 'Habilitar'} Dashboard`,
    body: `
      <div class="space-y-4">
        <div class="flex items-start gap-4 p-4 rounded-2xl ${currentlyEnabled ? 'bg-destructive/5 border border-destructive/10' : 'bg-primary/5 border border-primary/10'}">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentlyEnabled ? 'bg-destructive/10' : 'bg-primary/10'}">
            <i data-lucide="${currentlyEnabled ? 'eye-off' : 'layout-dashboard'}" class="w-5 h-5 ${currentlyEnabled ? 'text-destructive' : 'text-primary'}"></i>
          </div>
          <div>
            <p class="text-sm font-black">${currentlyEnabled ? 'Revocar' : 'Conceder'} acceso al Dashboard</p>
            <p class="text-xs text-muted-foreground mt-1">
              El usuario <strong>${userName}</strong>
              ${currentlyEnabled
                ? ' <strong>dejará de ver</strong> el Dashboard con KPIs, gráficos y estadísticas del sistema.'
                : ' <strong>podrá visualizar</strong> el Dashboard con KPIs financieros, gráficos y estadísticas estratégicas del sistema.'}
            </p>
          </div>
        </div>
        ${!currentlyEnabled ? `<div class="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p class="text-[10px] font-bold text-amber-700 flex items-center gap-1.5">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
            INFORMACIÓN SENSIBLE
          </p>
          <p class="text-[10px] text-amber-600 mt-1">El Dashboard expone KPIs operativos, montos de compras y estados del inventario. Asigne este acceso con discreción.</p>
        </div>` : ''}
      </div>`,
    confirmText: currentlyEnabled ? 'Sí, revocar acceso' : 'Sí, habilitar acceso',
    onConfirm: async () => {
      UI.loading('Actualizando permisos...');
      try {
        const res = await fetch('api/users.php', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, toggle_module: 'dashboard', value: !currentlyEnabled })
        }).then(r => r.json());
        UI.stopLoading();
        if (res.ok) {
          UI.toast(
            currentlyEnabled ? `Dashboard revocado a ${userName}` : `Dashboard habilitado para ${userName}`,
            currentlyEnabled ? 'warning' : 'success'
          );
          loadUsers();
        } else {
          UI.toast('Error: ' + res.error, 'error');
        }
      } catch(e) {
        UI.stopLoading();
        UI.toast('Error de conexión', 'error');
      }
    }
  });
  // Renderizar íconos dentro del modal
  setTimeout(() => lucide.createIcons(), 50);
};

function userFormHTML(u, roles, staff, isNew) {
  const userPerms = u && u.permisos ? u.permisos.split(',') : [];
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <h3 class="text-xs font-bold text-primary uppercase border-b pb-1">Información de Acceso</h3>
        <div><label class="text-sm font-medium">Nombre completo <span class="text-destructive">*</span></label>
          <input id="usr-nombre" class="input mt-1 w-full" placeholder="Juan Pérez" value="${u ? u.nombre : ''}"></div>
        <div><label class="text-sm font-medium">Usuario / Email <span class="text-destructive">*</span></label>
          <input id="usr-email" type="text" class="input mt-1 w-full" placeholder="ej. jperez o correo@catolica.edu" value="${u ? u.email : ''}"></div>
        <div>
          <label class="text-sm font-medium">${isNew ? 'Contraseña <span class="text-destructive">*</span>' : 'Nueva contraseña <span class="text-xs text-muted-foreground">(vacío = no cambiar)</span>'}</label>
          <div class="relative mt-1">
            <input id="usr-pass" type="password" class="input w-full pr-10" placeholder="••••••••">
            ${window.Auth.getUser() && window.Auth.getUser().role === 'admin' ? `
              <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary transition-colors" style="background:none;border:none;cursor:pointer;z-10;" onclick="togglePassVisibility()" title="Mostrar/Ocultar">
                <i data-lucide="eye" id="toggle-pass-icon" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
          ${window.Auth.getUser() && window.Auth.getUser().role === 'admin' ? `
            <div class="mt-2 flex justify-end">
              <button type="button" class="btn btn-outline btn-sm btn-sm-auto text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" onclick="generateUserPass()" title="Generar contraseña segura">
                <i data-lucide="key" class="w-3.5 h-3.5"></i> Generar contraseña
              </button>
            </div>
          ` : ''}
        </div>
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
      <div class="flex gap-2">
        <button class="btn btn-outline" onclick="openRolesModal()"><i data-lucide="shield"></i>Perfiles / Roles</button>
        <button class="btn btn-primary" onclick="newUser()"><i data-lucide="user-plus"></i>Nuevo usuario</button>
      </div>
    `)}

    <!-- Banner informativo Dashboard -->
    <div class="flex items-start gap-4 p-4 mb-4 rounded-2xl bg-primary/5 border border-primary/10">
      <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <i data-lucide="layout-dashboard" class="w-4 h-4 text-primary"></i>
      </div>
      <div>
        <p class="text-xs font-black text-primary uppercase tracking-wide">Control de acceso al Dashboard</p>
        <p class="text-[11px] text-muted-foreground mt-0.5">El Dashboard contiene KPIs financieros y operativos confidenciales. Usa el toggle <strong>Dashboard</strong> por usuario para habilitar o revocar su visualización. El rol <strong>admin</strong> siempre tiene acceso.</p>
      </div>
    </div>

    <div class="card">
      <div class="table-container">
        <table class="data">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario / Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th class="text-center">Dashboard</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
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

window.openRolesModal = async function() {
    UI.loading('Cargando perfiles...');
    try {
        const resp = await fetch('api/roles.php').then(r => r.json());
        const roles = resp.roles || [];
        UI.stopLoading();

        UI.modal({
            title: 'Gestión de Perfiles y Permisos',
            size: 'lg',
            body: `
                <div class="space-y-4">
                    <div class="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-4">
                        <p class="text-xs font-bold text-primary flex items-center gap-2">
                            <i data-lucide="info" class="w-4 h-4"></i>
                            CONTROL DE ELIMINACIÓN
                        </p>
                        <p class="text-[10px] text-muted-foreground mt-1">Habilite o deshabilite la capacidad de borrar registros históricos para cada perfil. El perfil <b>admin</b> siempre mantiene esta capacidad por integridad del sistema.</p>
                    </div>
                    <div class="table-container">
                        <table class="w-full text-left">
                            <thead class="text-[10px] uppercase font-bold text-muted-foreground border-b bg-muted/30">
                                <tr>
                                    <th class="px-4 py-2">Perfil</th>
                                    <th class="px-4 py-2">Descripción</th>
                                    <th class="px-4 py-2 text-center">Botón Eliminar</th>
                                    <th class="px-4 py-2 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                ${roles.map(r => `
                                    <tr class="hover:bg-muted/20 transition-colors">
                                        <td class="px-4 py-3 font-bold text-sm text-primary uppercase">${r.nombre.replace('_',' ')}</td>
                                        <td class="px-4 py-3 text-xs text-muted-foreground">${r.descripcion || '—'}</td>
                                        <td class="px-4 py-3 text-center">
                                            <div class="flex justify-center">
                                                <label class="relative inline-flex items-center cursor-pointer group">
                                                    <input type="checkbox" id="role-del-${r.id}" class="sr-only peer" ${r.can_delete == 1 ? 'checked' : ''} ${r.nombre === 'admin' ? 'disabled' : ''}>
                                                    <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                </label>
                                            </div>
                                        </td>
                                        <td class="px-4 py-3 text-right">
                                            <button class="btn btn-ghost p-2 text-primary hover:bg-primary/10 rounded-lg" onclick="saveRoleChanges(${r.id}, '${r.nombre}', '${r.descripcion}')" title="Guardar cambios">
                                                <i data-lucide="save" class="w-4 h-4"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
            hideConfirm: true,
            confirmText: 'Cerrar'
        });
        lucide.createIcons();
    } catch(e) { UI.stopLoading(); UI.toast('Error al cargar roles', 'error'); }
};

window.saveRoleChanges = async function(id, nombre, descripcion) {
    const canDelete = document.getElementById(`role-del-${id}`).checked ? 1 : 0;
    UI.loading('Actualizando perfil...');
    try {
        const res = await fetch('api/roles.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, nombre, descripcion, can_delete: canDelete })
        }).then(r => r.json());
        
        UI.stopLoading();
        if (res.ok) {
            UI.toast('Permisos del perfil actualizados', 'success');
            // Si el perfil editado es el del usuario actual, sugerimos recargar
            const user = window.Auth.getUser();
            if (user && user.role === nombre) {
                UI.confirm('Los cambios afectan a su perfil actual. ¿Desea recargar la sesión para aplicar los cambios?', () => {
                    location.reload();
                }, 'Cambios detectados');
            }
        } else UI.toast(res.error, 'error');
    } catch(e) { UI.stopLoading(); UI.toast('Error al guardar', 'error'); }
};
