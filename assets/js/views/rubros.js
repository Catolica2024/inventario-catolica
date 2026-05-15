// assets/js/views/rubros.js — Vista de Rubros de Proveedores

function rubroFormHTML(r) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div>
        <label class="text-sm font-medium">Código <span class="text-xs text-muted-foreground">(auto)</span></label>
        <input id="rub-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly value="${r ? (r.codigo || '') : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Nombre <span class="text-destructive">*</span></label>
        <input id="rub-nombre" class="input mt-1 w-full" placeholder="Ej: Librería y Papelería" value="${r ? r.nombre : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Descripción</label>
        <input id="rub-descripcion" class="input mt-1 w-full" placeholder="Breve descripción del rubro..." value="${r ? (r.descripcion || '') : ''}">
      </div>
    </div>`;
}

async function loadRubros() {
  const tbody = document.getElementById('rubros-table-body');
  if (!tbody) return;
  try {
    const resp = await fetch('api/rubros.php');
    const data = await resp.json();
    if (!data.rubros || data.rubros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-muted-foreground">No hay rubros registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.rubros.map(r => `
      <tr>
        <td class="font-mono text-xs">${r.codigo || '—'}</td>
        <td class="font-medium">${r.nombre}</td>
        <td class="text-muted-foreground text-sm">${r.descripcion || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editRubro(${r.id}, '${(r.codigo||'').replace(/'/g,"\\'")}', '${r.nombre.replace(/'/g,"\\'")}', '${(r.descripcion||'').replace(/'/g,"\\'")}')">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteRubro(${r.id}, '${r.nombre.replace(/'/g,"\\'")}')">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-destructive">Error al cargar.</td></tr>';
  }
}

window.newRubro = async function() {
  let nextCode = '';
  try {
    const r = await fetch('api/rubros.php?action=next_code');
    const d = await r.json();
    nextCode = d.next_code || '';
  } catch { }

  UI.modal({
    title: 'Nuevo Rubro',
    body: rubroFormHTML({ codigo: nextCode, nombre: '', descripcion: '' }),
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('rub-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return false; }
      try {
        const resp = await fetch('api/rubros.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: document.getElementById('rub-codigo').value.trim(),
            nombre,
            descripcion: document.getElementById('rub-descripcion').value.trim()
          })
        });
        const res = await resp.json();
        if (res.ok) { UI.toast('Rubro creado', 'success'); loadRubros(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

window.editRubro = function(id, codigo, nombre, descripcion) {
  UI.modal({
    title: 'Editar Rubro',
    body: rubroFormHTML({ id, codigo, nombre, descripcion }),
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const newNombre = document.getElementById('rub-nombre').value.trim();
      if (!newNombre) { UI.toast('El nombre es obligatorio', 'error'); return false; }
      try {
        const resp = await fetch('api/rubros.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            codigo: document.getElementById('rub-codigo').value.trim(),
            nombre: newNombre,
            descripcion: document.getElementById('rub-descripcion').value.trim()
          })
        });
        const res = await resp.json();
        if (res.ok) { UI.toast('Rubro actualizado', 'success'); loadRubros(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

window.deleteRubro = function(id, nombre) {
  UI.modal({
    title: 'Eliminar Rubro',
    body: `<p>¿Estás seguro de eliminar el rubro <strong>${nombre}</strong>?</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      try {
        const resp = await fetch(`api/rubros.php?id=${id}`, { method: 'DELETE' });
        const res = await resp.json();
        if (res.ok) { UI.toast('Rubro eliminado', 'success'); loadRubros(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

window.Views.rubros = function() {
  return `
    ${UI.pageHeader('Rubros de Proveedores','Categorización comercial de proveedores', `
      <button class="btn btn-primary" onclick="newRubro()"><i data-lucide="plus"></i>Nuevo rubro</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="rubros-table-body">
          <tr><td colspan="4" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
        </tbody>
      </table>
    </div>`;
};

window.Views.rubros.afterMount = loadRubros;
