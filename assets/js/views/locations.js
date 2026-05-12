async function loadLocations() {
  const tbody = document.getElementById('locations-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/locations.php').then(r => r.json());
    if (!data.locations || data.locations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay aulas o espacios registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.locations.map(l => `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${l.codigo || '—'}</td>
        <td class="font-medium">${l.nombre}</td>
        <td class="text-xs uppercase font-semibold">${l.tipo || '—'}</td>
        <td class="text-xs text-muted-foreground uppercase font-bold">${l.sede_nombre || '—'}</td>
        <td>${l.responsable_nombre || '<span class="text-muted-foreground text-xs italic">Sin responsable</span>'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editLocation(${l.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteLocation(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

function locationFormHTML(l, sedes, staff) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label class="text-sm font-medium">Sede <span class="text-destructive">*</span></label>
        <select id="loc-sede" class="select mt-1 w-full" onchange="generateLocCode()">
          <option value="">Seleccione sede...</option>
          ${sedes.map(s => `<option value="${s.id}" ${l && l.sede_id == s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Tipo de Espacio <span class="text-destructive">*</span></label>
        <select id="loc-tipo" class="select mt-1 w-full" onchange="generateLocCode()">
          ${['Aula','Laboratorio','Depósito','Oficina','Taller','Cancha','Otro'].map(t => `<option value="${t}" ${l && l.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Código Interno</label>
        <input id="loc-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed font-mono text-xs" readonly placeholder="Auto-generado" value="${l ? (l.codigo || '') : ''}"></div>
      <div><label class="text-sm font-medium">Nombre / Número <span class="text-destructive">*</span></label>
        <input id="loc-nombre" class="input mt-1 w-full" placeholder="Ej: Aula 305" value="${l ? l.nombre : ''}"></div>
      <div class="md:col-span-2"><label class="text-sm font-medium">Responsable / Encargado</label>
        <select id="loc-responsable" class="select mt-1 w-full">
          <option value="">Sin asignar</option>
          ${staff.map(s => `<option value="${s.id}" ${l && l.responsable_id == s.id ? 'selected' : ''}>${s.nombre} (${s.cargo || 'Personal'})</option>`).join('')}
        </select></div>
    </div>`;
}

window.generateLocCode = async function() {
    const sede_id = document.getElementById('loc-sede').value;
    const tipo = document.getElementById('loc-tipo').value;
    if (!sede_id) return;
    try {
        const resp = await fetch(`api/locations.php?action=next_code&sede_id=${sede_id}&tipo=${tipo}`).then(r => r.json());
        if (resp.next_code) document.getElementById('loc-codigo').value = resp.next_code;
    } catch(e) {}
};

window.newLocation = async function() {
  const [sedesR, staffR] = await Promise.all([
    fetch('api/sedes.php').then(r => r.json()).catch(() => ({ sedes: [] })),
    fetch('api/staff.php').then(r => r.json()).catch(() => ({ staff: [] }))
  ]);

  UI.modal({
    title: 'Registrar Nuevo Espacio',
    body: locationFormHTML(null, sedesR.sedes, staffR.staff),
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('loc-nombre').value.trim();
      const sede_id = document.getElementById('loc-sede').value;
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return; }
      
      const body = {
        codigo: document.getElementById('loc-codigo').value.trim(),
        nombre,
        tipo: document.getElementById('loc-tipo').value,
        sede_id,
        responsable_id: document.getElementById('loc-responsable').value || null
      };

      const res = await fetch('api/locations.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Espacio registrado con éxito', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.editLocation = async function(id) {
  const [locsR, sedesR, staffR] = await Promise.all([
    fetch('api/locations.php').then(r => r.json()),
    fetch('api/sedes.php').then(r => r.json()).catch(() => ({ sedes: [] })),
    fetch('api/staff.php').then(r => r.json()).catch(() => ({ staff: [] }))
  ]);
  const l = locsR.locations.find(x => x.id == id);
  if (!l) return;

  UI.modal({
    title: 'Editar Espacio',
    body: locationFormHTML(l, sedesR.sedes, staffR.staff),
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const nombre = document.getElementById('loc-nombre').value.trim();
      const sede_id = document.getElementById('loc-sede').value;
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return; }
      
      const body = {
        id,
        codigo: document.getElementById('loc-codigo').value.trim(),
        nombre,
        tipo: document.getElementById('loc-tipo').value,
        sede_id,
        responsable_id: document.getElementById('loc-responsable').value || null
      };

      const res = await fetch('api/locations.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Ubicación actualizada', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.deleteLocation = function(id, nombre) {
  UI.modal({
    title: 'Eliminar Espacio',
    body: `<p>¿Estás seguro de eliminar <strong>${nombre}</strong>? Se perderán las vinculaciones de activos en esta ubicación.</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/locations.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Ubicación eliminada', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.locations = function() {
  return `
    ${UI.pageHeader('Aulas y Espacios','Gestión de infraestructura y sedes', `
      <button class="btn btn-primary" onclick="newLocation()"><i data-lucide="plus"></i>Nuevo Espacio</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Código</th><th>Nombre / Nro</th><th>Tipo</th><th>Sede</th><th>Responsable</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="locations-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando espacios...</td></tr></tbody>
      </table>
    </div>`;
};

window.Views.locations.afterMount = loadLocations;
