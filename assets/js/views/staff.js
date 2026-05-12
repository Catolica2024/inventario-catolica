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
      <div class="md:col-span-2"><label class="text-sm font-medium">Teléfono / Contacto</label>
        <input id="staff-tel" class="input mt-1 w-full" placeholder="Ej: 987654321" value="${p ? p.telefono : ''}"></div>
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
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${p.codigo || '—'}</td>
        <td class="font-mono text-xs">${p.dni || '—'}</td>
        <td><div class="font-medium">${p.nombre}</div></td>
        <td><div class="text-xs text-muted-foreground uppercase font-bold">${p.cargo || '—'}</div></td>
        <td>${p.area_nombre || '<span class="text-muted-foreground">—</span>'}</td>
        <td>${p.telefono || '—'}</td>
        <td class="text-right whitespace-nowrap">
          <button class="btn btn-ghost p-1.5" onclick="editStaff(${p.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteStaff(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const body = {
        codigo: document.getElementById('staff-codigo').value,
        dni: document.getElementById('staff-dni').value.trim(),
        nombre,
        cargo: document.getElementById('staff-cargo').value.trim(),
        area_id: document.getElementById('staff-area').value,
        telefono: document.getElementById('staff-tel').value.trim()
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
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const body = {
        id,
        codigo: document.getElementById('staff-codigo').value,
        dni: document.getElementById('staff-dni').value.trim(),
        nombre,
        cargo: document.getElementById('staff-cargo').value.trim(),
        area_id: document.getElementById('staff-area').value,
        telefono: document.getElementById('staff-tel').value.trim()
      };
      const res = await fetch('api/staff.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Datos actualizados', 'success'); loadStaff(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.deleteStaff = function(id, nombre) {
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
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Código</th><th>DNI/ID</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Contacto</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="staff-table-body"><tr><td colspan="7" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.staff.afterMount = loadStaff;
