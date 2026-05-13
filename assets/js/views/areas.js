window.Views = window.Views || {};

async function loadAreas() {
  const tbody = document.getElementById('areas-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/areas.php').then(r => r.json());
    if (!data.areas || data.areas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-muted-foreground">No hay áreas o niveles registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.areas.map(a => `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${a.codigo || '—'}</td>
        <td class="font-medium">${a.nombre}</td>
        <td class="text-xs text-muted-foreground uppercase font-bold">${a.sede_nombre || '—'}</td>
        <td class="text-sm">${a.descripcion || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editArea(${a.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteArea(${a.id}, '${a.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar áreas.</td></tr>'; }
}

function areaFormHTML(a, sedes) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Sede <span class="text-destructive">*</span></label>
          <select id="area-sede" class="select mt-1 w-full" onchange="generateAreaCode()">
            <option value="">Seleccione sede...</option>
            ${sedes.map(s => `<option value="${s.id}" ${a && a.sede_id == s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}
          </select></div>
        <div><label class="text-sm font-medium">Código Interno</label>
          <input id="area-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed font-mono text-xs" readonly placeholder="Auto-generado" value="${a ? (a.codigo || '') : ''}"></div>
      </div>
      <div><label class="text-sm font-medium">Nombre del Área / Nivel <span class="text-destructive">*</span></label>
        <input id="area-nombre" class="input mt-1 w-full" placeholder="Ej: Primaria, Administración, etc." value="${a ? a.nombre : ''}"></div>
      <div><label class="text-sm font-medium">Descripción</label>
        <textarea id="area-desc" class="textarea mt-1 w-full h-20" placeholder="Opcional...">${a ? (a.descripcion || '') : ''}</textarea></div>
    </div>`;
}

window.generateAreaCode = async function() {
    const sede_id = document.getElementById('area-sede').value;
    if (!sede_id) return;
    try {
        const resp = await fetch(`api/areas.php?action=next_code&sede_id=${sede_id}`).then(r => r.json());
        if (resp.next_code) document.getElementById('area-codigo').value = resp.next_code;
    } catch(e) {}
};

window.newArea = async function() {
  const sedesR = await fetch('api/sedes.php').then(r => r.json()).catch(() => ({ sedes: [] }));

  UI.modal({
    title: 'Registrar Nueva Área / Nivel',
    body: areaFormHTML(null, sedesR.sedes),
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('area-nombre').value.trim();
      const sede_id = document.getElementById('area-sede').value;
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return; }
      
      const body = {
        codigo: document.getElementById('area-codigo').value.trim(),
        nombre,
        descripcion: document.getElementById('area-desc').value.trim(),
        sede_id
      };

      const res = await fetch('api/areas.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Área registrada con éxito', 'success'); loadAreas(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.editArea = async function(id) {
  const [areasR, sedesR] = await Promise.all([
    fetch('api/areas.php').then(r => r.json()),
    fetch('api/sedes.php').then(r => r.json()).catch(() => ({ sedes: [] }))
  ]);
  const a = areasR.areas.find(x => x.id == id);
  if (!a) return;

  UI.modal({
    title: 'Editar Área / Nivel',
    body: areaFormHTML(a, sedesR.sedes),
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const nombre = document.getElementById('area-nombre').value.trim();
      const sede_id = document.getElementById('area-sede').value;
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return; }
      
      const body = {
        id,
        codigo: document.getElementById('area-codigo').value.trim(),
        nombre,
        descripcion: document.getElementById('area-desc').value.trim(),
        sede_id
      };

      const res = await fetch('api/areas.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (res.ok) { UI.toast('Área actualizada', 'success'); loadAreas(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.deleteArea = function(id, nombre) {
  UI.modal({
    title: 'Eliminar Área',
    body: `<p>¿Estás seguro de eliminar <strong>${nombre}</strong>? No se podrá eliminar si tiene personal vinculado.</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/areas.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Área eliminada', 'success'); loadAreas(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.areas = function() {
  return `
    ${UI.pageHeader('Áreas y Niveles','Gestión de la estructura organizacional por sede', `
      <button class="btn btn-primary" onclick="newArea()"><i data-lucide="plus"></i>Nueva Área</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Código</th><th>Nombre</th><th>Sede</th><th>Descripción</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="areas-table-body"><tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando áreas...</td></tr></tbody>
      </table>
    </div>`;
};

window.Views.areas.afterMount = loadAreas;
