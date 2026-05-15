window.Views = window.Views || {};

function staffFormHTML(p, areas) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label class="text-sm font-medium">Código Interno</label>
        <input id="staff-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed font-mono text-xs" readonly placeholder="Auto-generado" value="${p ? p.codigo : ''}"></div>
      <div><label class="text-sm font-medium">DNI / ID</label>
        <input id="staff-dni" class="input mt-1 w-full" placeholder="Ej: 45123789" value="${p ? p.dni : ''}"></div>
      <div class="md:col-span-2"><label class="text-sm font-medium">Nombre Completo <span class="text-destructive">*</span></label>
        <input id="staff-nombre" class="input mt-1 w-full" placeholder="Ej: Mariela Salazar" value="${p ? p.nombre : ''}"></div>
      <div><label class="text-sm font-medium">Cargo</label>
        <input id="staff-cargo" class="input mt-1 w-full" placeholder="Ej: Docente Primaria" value="${p ? p.cargo : ''}"></div>
      <div><label class="text-sm font-medium">Área / Nivel</label>
        <select id="staff-area" class="select mt-1 w-full">
          <option value="">Sin asignar</option>
          ${areas.map(a => `<option value="${a.id}" ${p && p.area_id == a.id ? 'selected' : ''}>${a.nombre}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Teléfono / Contacto</label>
        <input id="staff-tel" class="input mt-1 w-full" placeholder="Ej: 987654321" value="${p ? p.telefono : ''}"></div>
      <div><label class="text-sm font-medium">Estado</label>
        <select id="staff-estado" class="select mt-1 w-full">
          <option value="activo" ${p && p.estado === 'activo' ? 'selected' : ''}>Activo</option>
          <option value="inactivo" ${p && p.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
        </select></div>
    </div>`;
}

async function loadStaff() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/staff.php').then(r => r.json());
    if (!data.staff || data.staff.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-muted-foreground">No hay personal registrado.</td></tr>';
      return;
    }
    tbody.innerHTML = data.staff.map(p => `
      <tr class="${p.estado === 'inactivo' ? 'bg-muted/30' : ''}">
        <td class="font-mono text-xs font-bold text-primary ${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${p.codigo || '—'}</td>
        <td class="font-mono text-xs ${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${p.dni || '—'}</td>
        <td class="${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}"><div class="font-medium">${p.nombre}</div></td>
        <td class="${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}"><div class="text-xs text-muted-foreground uppercase font-bold">${p.cargo || '—'}</div></td>
        <td class="${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${p.area_nombre || '<span class="text-muted-foreground">—</span>'}</td>
        <td class="${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${p.telefono || '—'}</td>
        <td class="text-right whitespace-nowrap">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5 ${p.estado === 'activo' ? 'text-destructive' : 'text-green-500'}" 
                    title="${p.estado === 'activo' ? 'Dar de baja' : 'Activar'}" 
                    onclick="toggleStaffStatus(${p.id}, '${p.estado}', '${p.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="${p.estado === 'activo' ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 ${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Ver Inventario Actual" onclick="viewStaffAssignments(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')"><i data-lucide="eye" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 ${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Ver Historial Completo" onclick="viewStaffHistory(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')"><i data-lucide="history" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 ${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Editar" onclick="editStaff(${p.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            ${window.canDelete(window.Auth.getUser()) ? 
              `<button class="btn btn-ghost p-1.5 text-destructive ${p.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Eliminar" onclick="deleteStaff(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
              ''
            }
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

window.newStaff = async function() {
  const [areasR, nextCodeR] = await Promise.all([
    fetch('api/areas.php').then(r => r.json()).catch(() => ({ areas: [] })),
    fetch('api/staff.php?action=next_code').then(r => r.json()).catch(() => ({}))
  ]);
  
  UI.modal({
    title: 'Registrar Personal',
    body: staffFormHTML(null, areasR.areas),
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('staff-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return false; }
      const body = {
        codigo: document.getElementById('staff-codigo').value,
        dni: document.getElementById('staff-dni').value.trim(),
        nombre,
        cargo: document.getElementById('staff-cargo').value.trim(),
        area_id: document.getElementById('staff-area').value,
        telefono: document.getElementById('staff-tel').value.trim(),
        estado: document.getElementById('staff-estado').value
      };
      const res = await fetch('api/staff.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Personal registrado', 'success'); loadStaff(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
  
  if (nextCodeR.next_code) {
      document.getElementById('staff-codigo').value = nextCodeR.next_code;
  }
};

window.editStaff = async function(id) {
  const [staffData, areasR] = await Promise.all([
    fetch('api/staff.php').then(r => r.json()),
    fetch('api/areas.php').then(r => r.json()).catch(() => ({ areas: [] }))
  ]);
  const p = staffData.staff.find(x => x.id == id);
  if (!p) return;
  UI.modal({
    title: 'Editar Personal',
    body: staffFormHTML(p, areasR.areas),
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const nombre = document.getElementById('staff-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return false; }
      const body = {
        id,
        codigo: document.getElementById('staff-codigo').value,
        dni: document.getElementById('staff-dni').value.trim(),
        nombre,
        cargo: document.getElementById('staff-cargo').value.trim(),
        area_id: document.getElementById('staff-area').value,
        telefono: document.getElementById('staff-tel').value.trim(),
        estado: document.getElementById('staff-estado').value
      };
      const res = await fetch('api/staff.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Datos actualizados', 'success'); loadStaff(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.deleteStaff = function(id, nombre) {
  if (!window.canDelete(window.Auth.getUser())) {
    UI.toast('Solo el Administrador puede eliminar personal', 'error');
    return;
  }
  UI.modal({
    title: 'Eliminar Personal',
    body: `<p>¿Estás seguro de eliminar a <strong>${nombre}</strong>? Se perderán sus vínculos de asignación.</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/staff.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Personal eliminado', 'success'); loadStaff(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.staff = function() {
  return `
    ${UI.pageHeader('Gestión de Personal','Docentes, Administrativos y Servicios', `
      <button class="btn btn-primary" onclick="newStaff()"><i data-lucide="plus"></i>Nuevo Personal</button>
    `)}
    <div class="card">
      <div class="table-container">
        <table class="data">
          <thead><tr><th>Código</th><th>DNI/ID</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Contacto</th><th class="text-right">Acciones</th></tr></thead>
          <tbody id="staff-table-body"><tr><td colspan="7" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
        </table>
      </div>
    </div>`;
};
window.toggleStaffStatus = async function(id, currentStatus, name) {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    const action = newStatus === 'activo' ? 'activar' : 'dar de baja';
    
    UI.modal({
        title: `${newStatus === 'activo' ? 'Activar' : 'Dar de baja'} Personal`,
        body: `<p>¿Está seguro de que desea <strong>${action}</strong> a <strong>${name}</strong>?</p>`,
        confirmText: `Sí, ${action}`,
        onConfirm: async () => {
            UI.loading('Actualizando estado...');
            try {
                const data = await fetch('api/staff.php').then(r => r.json());
                const p = data.staff.find(x => x.id == id);
                if (!p) throw new Error('Personal no encontrado');

                const body = { ...p, estado: newStatus };
                const res = await fetch('api/staff.php', { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(body) 
                }).then(r => r.json());

                UI.stopLoading();
                if (res.ok) {
                    UI.toast(`Personal ${newStatus === 'activo' ? 'activado' : 'dado de baja'}`, 'success');
                    loadStaff();
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

window.viewStaffAssignments = async function(id, nombre) {
    UI.loading('Cargando asignaciones...');
    try {
        const resp = await fetch('api/assignments.php').then(r => r.json());
        UI.stopLoading();
        
        const data = resp.assignments || [];
        const personalData = data.filter(a => a.personal_id == id);

        if (personalData.length === 0) {
            UI.modal({
                title: `Asignaciones: ${nombre}`,
                body: '<div class="text-center py-10 text-muted-foreground italic">Esta persona no tiene equipos asignados actualmente.</div>',
                hideConfirm: true
            });
            return;
        }

        const bodyHTML = `
            <div class="space-y-3">
                ${personalData.map(a => `
                    <div class="p-3 rounded-lg border border-border bg-white shadow-sm flex justify-between items-center ${a.estado === 'Devuelto' ? 'opacity-60 bg-muted/20' : ''}">
                        <div>
                            <div class="text-xs font-bold text-primary uppercase">${a.activo_nombre}</div>
                            <div class="text-[10px] font-mono text-muted-foreground">${a.activo_codigo}</div>
                        </div>
                        <div class="text-right">
                            <span class="badge ${a.estado === 'Activo' ? 'badge-blue' : 'badge-green'}">${a.estado}</span>
                            <div class="text-[9px] text-muted-foreground mt-1">${a.fecha_asignacion}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        UI.modal({
            title: `Asignaciones de Equipos: ${nombre}`,
            body: `<div class="pt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">${bodyHTML}</div>`,
            hideConfirm: true,
            confirmText: 'Cerrar'
        });
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar asignaciones', 'error');
    }
};

window.viewStaffHistory = async function(id, nombre) {
    UI.loading('Cargando historial completo...');
    try {
        const data = await fetch(`api/unified_history.php?type=staff&id=${id}`).then(r => r.json());
        UI.stopLoading();
        
        if (!data.history || data.history.length === 0) {
            UI.modal({
                title: `Historial Completo: ${nombre}`,
                body: '<p class="text-center py-10 text-muted-foreground italic">No hay actividad registrada para esta persona.</p>',
                hideConfirm: true
            });
            return;
        }

        const historyHTML = `
            <div class="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                ${data.history.map(h => {
                    let icon = 'circle';
                    let color = 'bg-muted text-muted-foreground';
                    let label = 'EVENTO';
                    let detail = '';

                    if (h.event_type === 'asignacion') {
                        const isEntry = h.tipo === 'Activo';
                        icon = isEntry ? 'package-plus' : 'package-minus';
                        color = isEntry ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
                        label = isEntry ? 'EQUIPO ASIGNADO' : 'EQUIPO DEVUELTO';
                        detail = `Equipo: ${h.item_name}`;
                    } else if (h.event_type === 'traslado_resp') {
                        icon = 'move';
                        color = 'bg-purple-100 text-purple-700';
                        label = 'TRASLADO GESTIONADO';
                        detail = `${h.cantidad} x ${h.item_name} de ${h.origen || 'Almacén'} a ${h.destino || 'Baja'}`;
                    } else if (h.event_type === 'mantenimiento') {
                        icon = 'wrench';
                        color = 'bg-orange-100 text-orange-700';
                        label = `MANTENIMIENTO DE EQUIPO`;
                        detail = `Item: ${h.item_name} | Técnico: ${h.tecnico || '—'}`;
                    }

                    return `
                        <div class="pl-8 relative">
                            <div class="absolute left-0 top-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${color} z-10">
                                <i data-lucide="${icon}" class="w-3 h-3"></i>
                            </div>
                            <div class="p-3 rounded-xl border border-border bg-white shadow-sm">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="text-[10px] font-bold uppercase tracking-wider">${label}</span>
                                    <span class="text-[10px] text-muted-foreground font-mono">${h.fecha}</span>
                                </div>
                                <div class="text-sm font-bold">${h.item_name}</div>
                                <div class="text-xs text-muted-foreground mt-0.5">${detail}</div>
                                ${h.motivo ? `<div class="mt-2 pt-2 border-t text-xs text-muted-foreground italic">"${h.motivo}"</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        UI.modal({
            title: `Historial de Actividad: ${nombre}`,
            body: `<div class="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pt-2">${historyHTML}</div>`,
            hideConfirm: true,
            confirmText: 'Cerrar'
        });
        lucide.createIcons();
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar historial', 'error');
    }
};

window.Views.staff.afterMount = loadStaff;
