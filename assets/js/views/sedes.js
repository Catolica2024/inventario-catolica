window.Views = window.Views || {};

async function loadSedes() {
  const tbody = document.getElementById('sedes-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/sedes.php').then(r => r.json());
    if (!data.sedes || data.sedes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-muted-foreground">No hay sedes registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = data.sedes.map(s => `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${s.codigo}</td>
        <td class="font-medium">${s.nombre}</td>
        <td>${s.distrito || '—'}</td>
        <td>${s.provincia || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editSede(${s.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteSede(${s.id}, '${s.nombre.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar sedes.</td></tr>'; }
}

function sedeFormHTML(s) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Código Único <span class="text-destructive">*</span></label>
          <input id="sede-codigo" class="input mt-1 w-full font-mono uppercase" maxlength="2" placeholder="Ej: C" value="${s ? s.codigo : ''}"></div>
        <div><label class="text-sm font-medium">Nombre Sede <span class="text-destructive">*</span></label>
          <input id="sede-nombre" class="input mt-1 w-full" placeholder="Ej: Sede Carabayllo" value="${s ? s.nombre : ''}"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Distrito</label>
          <input id="sede-distrito" class="input mt-1 w-full" value="${s ? (s.distrito || '') : ''}"></div>
        <div><label class="text-sm font-medium">Provincia</label>
          <input id="sede-provincia" class="input mt-1 w-full" value="${s ? (s.provincia || '') : ''}"></div>
      </div>
      <div><label class="text-sm font-medium">Dirección</label>
        <textarea id="sede-direccion" class="textarea mt-1 w-full h-20">${s ? (s.direccion || '') : ''}</textarea></div>
    </div>`;
}

window.newSede = () => openSedeModal(null);
window.editSede = async function(id) {
  const data = await fetch('api/sedes.php').then(r => r.json());
  const s = data.sedes.find(x => x.id == id);
  if (s) openSedeModal(s);
};

function openSedeModal(sData) {
  UI.modal({
    title: sData ? 'Editar Sede' : 'Nueva Sede',
    body: sedeFormHTML(sData),
    confirmText: sData ? 'Guardar Cambios' : 'Registrar Sede',
    onConfirm: async () => {
      const codigo = document.getElementById('sede-codigo').value.trim().toUpperCase();
      const nombre = document.getElementById('sede-nombre').value.trim();
      if (!codigo || !nombre) { UI.toast('Código y Nombre son obligatorios', 'error'); return false; }
      
      const body = { 
        codigo, nombre, 
        distrito: document.getElementById('sede-distrito').value.trim(),
        provincia: document.getElementById('sede-provincia').value.trim(),
        direccion: document.getElementById('sede-direccion').value.trim()
      };
      if (sData) body.id = sData.id;

      const resp = await fetch('api/sedes.php', { method: sData ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const res = await resp.json();
      if (res.ok) { UI.toast(sData ? 'Sede actualizada' : 'Sede registrada', 'success'); loadSedes(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
}

window.deleteSede = function(id, nombre) {
  UI.modal({ title: 'Eliminar Sede', body: `<p>¿Eliminar la sede <strong>${nombre}</strong>?</p>`, confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/sedes.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Sede eliminada', 'success'); loadSedes(); }
    }
  });
};

window.Views.sedes = function() {
  return `
    ${UI.pageHeader('Gestión de Sedes','Sucursales y campus del colegio', `
      <button class="btn btn-primary" onclick="newSede()"><i data-lucide="plus"></i>Nueva sede</button>
    `)}
    <div class="card">
      <div class="table-container">
        <table class="data">
          <thead><tr><th>Código</th><th>Nombre</th><th>Distrito</th><th>Provincia</th><th class="text-right">Acciones</th></tr></thead>
          <tbody id="sedes-table-body"><tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
        </table>
      </div>
    </div>`;
};
window.Views.sedes.afterMount = loadSedes;
