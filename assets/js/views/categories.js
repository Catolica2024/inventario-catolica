// assets/js/views/categories.js — Gestión de Categorías y Prefijos

async function loadInventoryCategories() {
  const tbody = document.getElementById('categories-inv-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/categories_inventario.php').then(r => r.json());
    if (!data.categories || data.categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-muted-foreground">No hay categorías registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = data.categories.map(c => `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${c.prefijo || '—'}</td>
        <td class="font-medium">${c.nombre}</td>
        <td class="text-xs uppercase font-semibold">${c.tipo || '—'}</td>
        <td class="text-center font-bold text-orange-600">${c.stock_minimo || 0}</td>
        <td class="text-xs text-muted-foreground">${c.descripcion || '—'}</td>
        <td class="text-right">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5" onclick="editInvCategory(${c.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteInvCategory(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar categorías.</td></tr>'; }
}

window.newInvCategory = function() {
  UI.modal({
    title: 'Nueva Categoría de Inventario',
    body: `
      <div class="grid grid-cols-1 gap-4">
        <div><label class="text-sm font-medium">Nombre de la Categoría <span class="text-destructive">*</span></label>
          <input id="cat-nombre" class="input mt-1 w-full" placeholder="Ej: Laptops, Sillas, Útiles" oninput="autoGeneratePrefix(this.value)"></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="text-sm font-medium">Prefijo Institucional <span class="text-xs text-muted-foreground">(Bloqueado)</span></label>
            <input id="cat-prefijo" class="input mt-1 w-full font-mono uppercase bg-muted cursor-not-allowed" readonly maxlength="3" placeholder="---"></div>
          <div><label class="text-sm font-medium">Tipo de Bien <span class="text-destructive">*</span></label>
            <select id="cat-tipo" class="select mt-1 w-full">
              <option value="equipo">Equipo (Activo)</option>
              <option value="mobiliario">Mobiliario</option>
              <option value="insumo">Insumo / Consumible</option>
            </select></div>
          <div><label class="text-sm font-medium">Stock Mínimo <span class="text-xs text-muted-foreground">(Alerta)</span></label>
            <input type="number" id="cat-stock-min" class="input mt-1 w-full" value="5" min="0"></div>
        </div>
        <div><label class="text-sm font-medium">Descripción</label>
          <textarea id="cat-desc" class="input mt-1 w-full h-20 resize-none"></textarea></div>
      </div>`,
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('cat-nombre').value.trim();
      const prefijo = document.getElementById('cat-prefijo').value.trim().toUpperCase();
      const tipo = document.getElementById('cat-tipo').value;
      if (!nombre || !prefijo) { UI.toast('Nombre y Prefijo son obligatorios', 'error'); return false; }
      
      const res = await fetch('api/categories_inventario.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            nombre, 
            prefijo, 
            tipo, 
            stock_minimo: document.getElementById('cat-stock-min').value,
            descripcion: document.getElementById('cat-desc').value 
        }) 
      }).then(r => r.json());
      
      if (res.ok) { UI.toast('Categoría creada', 'success'); loadInventoryCategories(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views['categories-inv'] = function() {
  return `
    ${UI.pageHeader('Categorías de Inventario','Configuración de rubros y prefijos de codificación', `
      <button class="btn btn-primary" onclick="newInvCategory()"><i data-lucide="plus"></i>Nueva Categoría</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Prefijo</th><th>Nombre</th><th>Tipo</th><th class="text-center">Stock Mín.</th><th>Descripción</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="categories-inv-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando categorías...</td></tr></tbody>
      </table>
    </div>`;
};

window.Views['categories-inv'].afterMount = loadInventoryCategories;

window.autoGeneratePrefix = function(name) {
    const input = document.getElementById('cat-prefijo');
    if (!input) return;
    
    // Limpiar nombre: quitar acentos y caracteres raros
    const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s]/g, "").trim().toUpperCase();
    if (!clean) { input.value = ''; return; }

    const words = clean.split(/\s+/).filter(w => w.length > 2 || words.length === 1); // Ignorar palabras cortas como "de", "la"
    let prefix = '';

    if (words.length === 1) {
        prefix = words[0].substring(0, 3);
    } else if (words.length === 2) {
        prefix = words[0].substring(0, 2) + words[1].substring(0, 1);
    } else {
        prefix = words[0].substring(0, 1) + words[1].substring(0, 1) + words[2].substring(0, 1);
    }

    // Asegurar 3 caracteres rellenando con X si es necesario
    input.value = prefix.padEnd(3, 'X').substring(0, 3).toUpperCase();
};

window.editInvCategory = async function(id) {
    const data = await fetch('api/categories_inventario.php').then(r => r.json());
    const c = data.categories.find(x => x.id == id);
    if (!c) return;

    UI.modal({
        title: 'Editar Categoría',
        body: `
          <div class="grid grid-cols-1 gap-4">
            <div><label class="text-sm font-medium">Nombre de la Categoría <span class="text-destructive">*</span></label>
              <input id="cat-nombre" class="input mt-1 w-full" value="${c.nombre}" oninput="autoGeneratePrefix(this.value)"></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="text-sm font-medium">Prefijo Institucional <span class="text-xs text-muted-foreground">(Bloqueado)</span></label>
                <input id="cat-prefijo" class="input mt-1 w-full font-mono uppercase bg-muted cursor-not-allowed" readonly value="${c.prefijo || '---'}"></div>
              <div><label class="text-sm font-medium">Tipo de Bien <span class="text-destructive">*</span></label>
                <select id="cat-tipo" class="select mt-1 w-full">
                  <option value="equipo" ${c.tipo === 'equipo' ? 'selected' : ''}>Equipo (Activo)</option>
                  <option value="mobiliario" ${c.tipo === 'mobiliario' ? 'selected' : ''}>Mobiliario</option>
                  <option value="insumo" ${c.tipo === 'insumo' ? 'selected' : ''}>Insumo / Consumible</option>
                </select></div>
              <div><label class="text-sm font-medium">Stock Mínimo</label>
                <input type="number" id="cat-stock-min" class="input mt-1 w-full" value="${c.stock_minimo || 0}" min="0"></div>
            </div>
            <div><label class="text-sm font-medium">Descripción</label>
              <textarea id="cat-desc" class="input mt-1 w-full h-20 resize-none">${c.descripcion || ''}</textarea></div>
          </div>`,
        confirmText: 'Guardar cambios',
        onConfirm: async () => {
            const nombre = document.getElementById('cat-nombre').value.trim();
            if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return false; }
            
            const res = await fetch('api/categories_inventario.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    id, 
                    nombre, 
                    tipo: document.getElementById('cat-tipo').value, 
                    stock_minimo: document.getElementById('cat-stock-min').value,
                    descripcion: document.getElementById('cat-desc').value, 
                    prefijo: document.getElementById('cat-prefijo').value 
                }) 
            }).then(r => r.json());
            
            if (res.ok) { UI.toast('Categoría actualizada', 'success'); loadInventoryCategories(); }
            else UI.toast('Error: ' + res.error, 'error');
        }
    });
};

window.deleteInvCategory = function(id, nombre) {
    UI.modal({
        title: 'Eliminar Categoría',
        body: `<p>¿Estás seguro de eliminar la categoría <strong>${nombre}</strong>? Esta acción no se puede deshacer.</p>`,
        confirmText: 'Sí, eliminar',
        onConfirm: async () => {
            const res = await fetch(`api/categories_inventario.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
            if (res.ok) { UI.toast('Categoría eliminada', 'success'); loadInventoryCategories(); }
            else UI.toast('Error: ' + res.error, 'error');
        }
    });
};
