window.Views = window.Views || {};
function tableView(title, subtitle, columns, rows, addLabel='Nuevo') {
  return `
    ${UI.pageHeader(title, subtitle, `
      <div class="relative">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></i>
        <input class="input pl-9 w-64" placeholder="Buscar..." />
      </div>
      <button class="btn btn-outline"><i data-lucide="filter"></i>Filtros</button>
      <button class="btn btn-primary"><i data-lucide="plus"></i>${addLabel}</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}<th class="text-right">Acciones</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}<td class="text-right">
            <button class="btn btn-ghost p-1.5"><i data-lucide="eye" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 text-destructive"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
window._tableView = tableView;

// ---- INVENTARIO ----
let _allItems = []; // caché local para búsqueda sin requests adicionales

function renderInventoryRows(items) {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No se encontraron ítems.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td class="font-mono text-xs">${item.codigo || '—'}</td>
      <td class="font-medium">${item.nombre}</td>
      <td>${item.marca || '—'}</td>
      <td>${item.categoria_nombre || 'Sin categoría'}</td>
      <td class="font-semibold">${item.stock_minimo}</td>
      <td class="text-right whitespace-nowrap">
        <button class="btn btn-ghost p-1.5" onclick="viewItem(${item.id})" title="Ver detalle"><i data-lucide="eye" class="w-4 h-4"></i></button>
        <button class="btn btn-ghost p-1.5" onclick="editItem(${item.id})" title="Editar"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteItem(${item.id})" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </td>
    </tr>`).join('');
  lucide.createIcons();
}

function applyInventoryFilters() {
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const cat = document.getElementById('inv-cat-filter')?.value || '';
  const filtered = _allItems.filter(item => {
    const matchQ = !q || item.nombre.toLowerCase().includes(q) || (item.codigo || '').toLowerCase().includes(q) || (item.marca || '').toLowerCase().includes(q);
    const matchCat = !cat || String(item.categoria_inventario_id) === cat;
    return matchQ && matchCat;
  });
  renderInventoryRows(filtered);
}

window.Views.inventory = function() {
  return `
    ${UI.pageHeader('Inventario','Catálogo general de ítems del colegio', `
      <div class="relative">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></i>
        <input id="inv-search" class="input pl-9 w-64" placeholder="Buscar por nombre, código, marca..." />
      </div>
      <select id="inv-cat-filter" class="select w-44">
        <option value="">Todas las categorías</option>
      </select>
      <button class="btn btn-primary" onclick="Router.go('add-item')"><i data-lucide="plus"></i>Agregar ítem</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead>
          <tr><th>Código</th><th>Ítem</th><th>Marca</th><th>Categoría</th><th>Stock Mín.</th><th class="text-right">Acciones</th></tr>
        </thead>
        <tbody id="inventory-table-body">
          <tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando inventario...</td></tr>
        </tbody>
      </table>
    </div>`;
};

window.Views.inventory.afterMount = async function() {
  try {
    const [itemsData, catData] = await Promise.all([
      fetch('api/items.php').then(r => r.json()),
      fetch('api/categories_inventario.php').then(r => r.json())
    ]);

    _allItems = itemsData.items || [];

    // Poblar filtro de categorías
    const catFilter = document.getElementById('inv-cat-filter');
    if (catFilter && catData.categories) {
      catData.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        catFilter.appendChild(opt);
      });
      catFilter.addEventListener('change', applyInventoryFilters);
    }

    // Búsqueda en tiempo real
    const searchInput = document.getElementById('inv-search');
    if (searchInput) {
      searchInput.addEventListener('input', applyInventoryFilters);
    }

    renderInventoryRows(_allItems);

  } catch (err) {
    document.getElementById('inventory-table-body').innerHTML =
      '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>';
  }
};

// Ver detalle del ítem
window.viewItem = function(id) {
  const item = _allItems.find(i => i.id == id);
  if (!item) return;
  UI.modal({
    title: `Detalle: ${item.nombre}`,
    body: `
      <div class="space-y-3 text-sm">
        <div class="grid grid-cols-2 gap-3">
          <div><span class="text-muted-foreground">Código</span><p class="font-mono font-bold mt-0.5">${item.codigo || '—'}</p></div>
          <div><span class="text-muted-foreground">Categoría</span><p class="mt-0.5">${item.categoria_nombre || '—'}</p></div>
          <div><span class="text-muted-foreground">Marca</span><p class="mt-0.5">${item.marca || '—'}</p></div>
          <div><span class="text-muted-foreground">Modelo</span><p class="mt-0.5">${item.modelo || '—'}</p></div>
          <div><span class="text-muted-foreground">Stock mínimo</span><p class="font-bold mt-0.5">${item.stock_minimo}</p></div>
          <div><span class="text-muted-foreground">Registrado</span><p class="mt-0.5">${item.created_at ? item.created_at.split(' ')[0] : '—'}</p></div>
        </div>
        ${item.ficha_tecnica ? `<div class="pt-2 border-t border-border"><span class="text-muted-foreground">Ficha técnica</span><p class="mt-1">${item.ficha_tecnica}</p></div>` : ''}
      </div>`,
    confirmText: 'Cerrar',
    onConfirm: () => {}
  });
};

// Editar ítem
window.editItem = async function(id) {
  const item = _allItems.find(i => i.id == id);
  if (!item) return;
  const catData = await fetch('api/categories_inventario.php').then(r => r.json()).catch(() => ({ categories: [] }));

  UI.modal({
    title: 'Editar ítem',
    body: `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Código <span class="text-xs text-muted-foreground">(auto)</span></label>
          <input class="input mt-1 w-full bg-muted cursor-not-allowed" readonly value="${item.codigo || ''}"></div>
        <div><label class="text-sm font-medium">Nombre <span class="text-destructive">*</span></label>
          <input id="edit-nombre" class="input mt-1 w-full" value="${item.nombre}"></div>
        <div><label class="text-sm font-medium">Marca</label>
          <input id="edit-marca" class="input mt-1 w-full" value="${item.marca || ''}"></div>
        <div><label class="text-sm font-medium">Modelo</label>
          <input id="edit-modelo" class="input mt-1 w-full" value="${item.modelo || ''}"></div>
        <div><label class="text-sm font-medium">Categoría</label>
          <select id="edit-cat" class="select mt-1 w-full">
            <option value="">Sin categoría</option>
            ${catData.categories.map(c => `<option value="${c.id}" ${item.categoria_inventario_id == c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
          </select></div>
        <div><label class="text-sm font-medium">Stock Mínimo</label>
          <input id="edit-stock" type="number" class="input mt-1 w-full" value="${item.stock_minimo}"></div>
        <div class="md:col-span-2"><label class="text-sm font-medium">Ficha técnica</label>
          <textarea id="edit-ficha" class="textarea mt-1 w-full">${item.ficha_tecnica || ''}</textarea></div>
      </div>`,
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const nombre = document.getElementById('edit-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const body = {
        id: item.id,
        codigo: item.codigo,
        nombre,
        marca: document.getElementById('edit-marca').value.trim(),
        modelo: document.getElementById('edit-modelo').value.trim(),
        categoria_inventario_id: document.getElementById('edit-cat').value,
        stock_minimo: document.getElementById('edit-stock').value,
        ficha_tecnica: document.getElementById('edit-ficha').value.trim()
      };
      try {
        const resp = await fetch('api/items.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const res = await resp.json();
        if (res.ok) {
          UI.toast('Ítem actualizado', 'success');
          // Refrescar lista
          const fresh = await fetch('api/items.php').then(r => r.json());
          _allItems = fresh.items || [];
          applyInventoryFilters();
        } else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

// Eliminar ítem
window.deleteItem = async function(id) {
  const item = _allItems.find(i => i.id == id);
  UI.modal({
    title: 'Eliminar ítem',
    body: `<p>¿Eliminar <strong>${item ? item.nombre : 'este ítem'}</strong>? Esta acción no se puede deshacer.</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      try {
        const resp = await fetch(`api/items.php?id=${id}`, { method: 'DELETE' });
        const res = await resp.json();
        if (res.ok) {
          UI.toast('Ítem eliminado', 'success');
          _allItems = _allItems.filter(i => i.id != id);
          applyInventoryFilters();
        } else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};


window.Views.add_item = window.Views['add-item'] = function() {
  return `
    ${UI.pageHeader('Agregar artículo','Registra un nuevo ítem en el catálogo')}
    <div class="card p-6 max-w-3xl">
      <form id="add-item-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Código <span class="text-xs text-muted-foreground">(automático)</span></label><input name="codigo" id="add-item-codigo" class="input mt-1 bg-muted cursor-not-allowed" readonly placeholder="Auto-generado"></div>
        <div><label class="text-sm font-medium">Nombre</label><input name="nombre" required class="input mt-1" placeholder="Ej: Laptop Dell"></div>
        <div><label class="text-sm font-medium">Marca</label><input name="marca" class="input mt-1" placeholder="Dell"></div>
        <div><label class="text-sm font-medium">Modelo</label><input name="modelo" class="input mt-1" placeholder="Latitude 5430"></div>
        <div>
          <label class="text-sm font-medium">Categoría</label>
          <select name="categoria_inventario_id" id="item-category-select" class="select mt-1" onchange="generateItemCode()">
            <option value="">Cargando categorías...</option>
          </select>
        </div>
        <div><label class="text-sm font-medium">Stock Mínimo</label><input type="number" name="stock_minimo" class="input mt-1" value="0"></div>
        <div class="md:col-span-2"><label class="text-sm font-medium">Ficha técnica</label><textarea name="ficha_tecnica" class="textarea mt-1" placeholder="Descripción y especificaciones..."></textarea></div>
        
        <div class="md:col-span-2 flex justify-end gap-2">
          <button type="button" class="btn btn-outline" onclick="Router.go('inventory')">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar artículo</button>
        </div>
      </form>
    </div>`;
};

window.Views.add_item.afterMount = async function() {
  const form = document.getElementById('add-item-form');
  const select = document.getElementById('item-category-select');
  const codigoInput = document.querySelector('#add-item-form input[name="codigo"]');

  // Cargar categorías y código automático en paralelo
  const [catResp, codeResp] = await Promise.all([
    fetch('api/categories_inventario.php').then(r => r.json()).catch(() => ({ categories: [] })),
    fetch('api/items.php?action=next_code').then(r => r.json()).catch(() => ({}))
  ]);

  select.innerHTML = '<option value="">Seleccione una categoría</option>' +
    catResp.categories.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

  window.generateItemCode = async function() {
    const cat_id = select.value;
    if (!cat_id) return;
    try {
        const resp = await fetch(`api/items.php?action=next_code&categoria_id=${cat_id}`).then(r => r.json());
        if (resp.next_code) codigoInput.value = resp.next_code;
    } catch(e) {}
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    try {
      const resp = await fetch('api/items.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const res = await resp.json();
      if (res.ok) {
        UI.toast('Artículo guardado', 'success');
        Router.go('inventory');
      } else {
        UI.toast('Error: ' + res.error, 'error');
      }
    } catch (err) {
      UI.toast('Error de conexión', 'error');
    }
  };
};
// ---- ACTIVOS ----
const ESTADOS_ACTIVO = ['Operativo', 'Mantenimiento', 'Reparación', 'Baja'];
const BADGE_ESTADO = { 'Operativo': 'badge-green', 'Mantenimiento': 'badge-yellow', 'Reparación': 'badge-cyan', 'Baja': 'badge-red' };

function assetFormHTML(a, items, locations) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">N° de Serie <span class="text-destructive">*</span></label>
          <input id="asset-serie" class="input mt-1 w-full" placeholder="Ej: SN-123456" value="${a ? a.numero_serie : ''}"></div>
        <div><label class="text-sm font-medium text-primary font-bold">Código Interno <span class="text-xs text-muted-foreground">(Automático)</span></label>
            <input id="asset-codigo-interno" class="input mt-1 w-full bg-muted font-mono text-xs cursor-not-allowed" readonly placeholder="Se generará al elegir Ítem y Ubicación" value="${a ? (a.codigo_interno || '') : ''}">
        </div>
      </div>
      <div><label class="text-sm font-medium">Ítem <span class="text-destructive">*</span></label>
        <select id="asset-item" class="select mt-1 w-full" onchange="generateAssetCode()">
          <option value="">Seleccione un ítem</option>
          ${items.map(i => `<option value="${i.id}" ${a && a.item_id == i.id ? 'selected' : ''}>${i.nombre} (${i.codigo})</option>`).join('')}
        </select></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Ubicación</label>
            <select id="asset-ubicacion" class="select mt-1 w-full" onchange="generateAssetCode()">
            <option value="">Sin asignar</option>
            ${locations.map(l => `<option value="${l.id}" ${a && a.ubicacion_id == l.id ? 'selected' : ''}>${l.nombre}</option>`).join('')}
            </select></div>
        <div><label class="text-sm font-medium">Estado</label>
            <select id="asset-estado" class="select mt-1 w-full">
            ${['Pendiente de Registro', ...ESTADOS_ACTIVO].map(e => `<option value="${e}" ${a && a.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select></div>
      </div>
    </div>`;
}

async function loadAssets() {
  const tbody = document.getElementById('assets-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/assets.php').then(r => r.json());
    if (!data.assets || data.assets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay activos registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.assets.map(a => `
      <tr>
        <td>
            <div class="font-mono text-xs font-bold">${a.numero_serie}</div>
            <div class="text-[10px] text-primary font-bold">${a.codigo_interno || 'SIN CÓDIGO'}</div>
        </td>
        <td class="font-medium">${a.item_nombre}</td>
        <td class="text-xs text-muted-foreground">${a.categoria_nombre || '—'}</td>
        <td>${a.ubicacion_nombre || '<span class="text-muted-foreground">—</span>'}</td>
        <td><span class="badge ${BADGE_ESTADO[a.estado] || 'badge-gray'}">${a.estado}</span></td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editAsset(${a.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteAsset(${a.id}, '${a.numero_serie.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

async function openAssetModal(assetData) {
  const [itemsR, locsR] = await Promise.all([
    fetch('api/items.php').then(r => r.json()).catch(() => ({ items: [] })),
    fetch('api/locations.php').then(r => r.json()).catch(() => ({ locations: [] }))
  ]);
  UI.modal({
    title: assetData ? 'Editar activo' : 'Nuevo activo',
    body: assetFormHTML(assetData, itemsR.items, locsR.locations),
    confirmText: assetData ? 'Guardar cambios' : 'Registrar activo',
    onConfirm: async () => {
      const serie = document.getElementById('asset-serie').value.trim();
      const item_id = document.getElementById('asset-item').value;
      if (!serie || !item_id) { UI.toast('Serie e Ítem son obligatorios', 'error'); return; }
      const body = { 
        numero_serie: serie, 
        codigo_interno: document.getElementById('asset-codigo-interno').value.trim(),
        item_id, 
        ubicacion_id: document.getElementById('asset-ubicacion').value, 
        estado: document.getElementById('asset-estado').value 
      };
      if (assetData) body.id = assetData.id;
      try {
        const resp = await fetch('api/assets.php', { method: assetData ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const res = await resp.json();
        if (res.ok) { 
            UI.toast(assetData ? 'Activo actualizado' : 'Activo registrado', 'success'); 
            document.getElementById('modal-overlay')?.remove();
            loadAssets(); 
        }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
  lucide.createIcons();
}

window.generateAssetCode = async function() {
    const item_id = document.getElementById('asset-item').value;
    const ubicacion_id = document.getElementById('asset-ubicacion').value;
    if (!item_id || !ubicacion_id) {
        UI.toast('Seleccione Ítem y Ubicación primero', 'warning');
        return;
    }
    try {
        const resp = await fetch(`api/assets.php?action=next_code&item_id=${item_id}&ubicacion_id=${ubicacion_id}`).then(r => r.json());
        if (resp.next_code) {
            document.getElementById('asset-codigo-interno').value = resp.next_code;
        } else {
            UI.toast('No se pudo generar el código', 'error');
        }
    } catch (e) {
        UI.toast('Error al conectar con el servidor', 'error');
    }
};

window.newAsset = () => openAssetModal(null);
window.editAsset = async function(id) {
  const data = await fetch('api/assets.php').then(r => r.json());
  const asset = data.assets.find(a => a.id == id);
  if (asset) openAssetModal(asset);
};
window.deleteAsset = function(id, serie) {
  UI.modal({
    title: 'Eliminar activo',
    body: `<p>¿Eliminar el activo con N° de serie <strong>${serie}</strong>?</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/assets.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Activo eliminado', 'success'); loadAssets(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.assets = function() {
  return `
    ${UI.pageHeader('Gestión de Activos','Activos individualizados con número de serie', `
      <button class="btn btn-primary" onclick="newAsset()"><i data-lucide="plus"></i>Nuevo activo</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>N° Serie</th><th>Activo</th><th>Categoría</th><th>Ubicación</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="assets-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.assets.afterMount = loadAssets;


// ---- Helpers de categorías ----
function categoryFormHTML(cat) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium">Código <span class="text-xs text-muted-foreground">(auto)</span></label>
          <input id="cat-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly value="${cat ? (cat.codigo || '') : ''}">
        </div>
        <div>
          <label class="text-sm font-medium">Tipo de Bien <span class="text-destructive">*</span></label>
          <select id="cat-tipo" class="select mt-1 w-full">
            <option value="insumo" ${cat && cat.tipo === 'insumo' ? 'selected' : ''}>Insumo (Consumible)</option>
            <option value="activo" ${cat && cat.tipo === 'activo' ? 'selected' : ''}>Activo (Inventariable)</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium">Nombre <span class="text-destructive">*</span></label>
          <input id="cat-nombre" class="input mt-1 w-full" placeholder="Ej: Material didáctico" value="${cat ? cat.nombre : ''}">
        </div>
        <div>
          <label class="text-sm font-medium">Prefijo Código <span class="text-xs text-muted-foreground">(3 letras)</span></label>
          <input id="cat-prefijo" class="input mt-1 w-full font-mono uppercase" maxlength="3" placeholder="Ej: LPT" value="${cat ? (cat.prefijo || '') : ''}">
        </div>
      </div>
      <div>
        <label class="text-sm font-medium">Descripción</label>
        <input id="cat-descripcion" class="input mt-1 w-full" placeholder="Breve descripción..." value="${cat ? (cat.descripcion || '') : ''}">
      </div>
    </div>`;
}

async function loadCategories() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;
  try {
    const resp = await fetch('api/categories_inventario.php');
    const data = await resp.json();
    if (!data.categories || data.categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-muted-foreground">No hay categorías registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = data.categories.map(c => `
      <tr>
        <td class="font-mono text-xs">
            <div class="font-bold">${c.codigo || '—'}</div>
            <div class="text-[10px] text-primary">Prefix: ${c.prefijo || '—'}</div>
        </td>
        <td>
            <div class="font-medium">${c.nombre}</div>
            <div class="text-[10px] uppercase font-bold ${c.tipo === 'activo' ? 'text-purple-600' : 'text-blue-600'}">${c.tipo || 'insumo'}</div>
        </td>
        <td class="text-muted-foreground text-sm">${c.descripcion || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editCategory(${c.id}, '${(c.codigo||'').replace(/'/g,"\\'")}', '${c.nombre.replace(/'/g,"\\'")}', '${(c.descripcion||'').replace(/'/g,"\\'")}', '${c.tipo}', '${(c.prefijo||'').replace(/'/g,"\\'")}')">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteCategory(${c.id}, '${c.nombre.replace(/'/g,"\\'")}')">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-destructive">Error al cargar.</td></tr>';
  }
}

window.newCategory = async function() {
  let nextCode = '';
  try {
    const r = await fetch('api/categories_inventario.php?action=next_code');
    const d = await r.json();
    nextCode = d.next_code || '';
  } catch { /* si falla, el campo queda vacío */ }

  UI.modal({
    title: 'Nueva categoría',
    body: categoryFormHTML({ codigo: nextCode, nombre: '', descripcion: '' }),
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('cat-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      try {
        const resp = await fetch('api/categories_inventario.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: document.getElementById('cat-codigo').value.trim(),
            nombre,
            descripcion: document.getElementById('cat-descripcion').value.trim(),
            tipo: document.getElementById('cat-tipo').value,
            prefijo: document.getElementById('cat-prefijo').value.trim().toUpperCase()
          })
        });
        const res = await resp.json();
        if (res.ok) { UI.toast('Categoría creada', 'success'); loadCategories(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

window.editCategory = function(id, codigo, nombre, descripcion, tipo, prefijo) {
  UI.modal({
    title: 'Editar categoría',
    body: categoryFormHTML({ id, codigo, nombre, descripcion, tipo, prefijo }),
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const newNombre = document.getElementById('cat-nombre').value.trim();
      if (!newNombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      try {
        const resp = await fetch('api/categories_inventario.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            codigo: document.getElementById('cat-codigo').value.trim(),
            nombre: newNombre,
            descripcion: document.getElementById('cat-descripcion').value.trim(),
            tipo: document.getElementById('cat-tipo').value,
            prefijo: document.getElementById('cat-prefijo').value.trim().toUpperCase()
          })
        });
        const res = await resp.json();
        if (res.ok) { UI.toast('Categoría actualizada', 'success'); loadCategories(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

window.deleteCategory = function(id, nombre) {
  UI.modal({
    title: 'Eliminar categoría',
    body: `<p>¿Estás seguro de eliminar la categoría <strong>${nombre}</strong>? Esta acción no se puede deshacer.</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      try {
        const resp = await fetch(`api/categories_inventario.php?id=${id}`, { method: 'DELETE' });
        const res = await resp.json();
        if (res.ok) { UI.toast('Categoría eliminada', 'success'); loadCategories(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};

window.Views['categories-inv'] = function() {
  return `
    ${UI.pageHeader('Categorías de Inventario','Agrupaciones de insumos y activos', `
      <button class="btn btn-primary" onclick="newCategory()"><i data-lucide="plus"></i>Nueva categoría</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="categories-table-body">
          <tr><td colspan="4" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
        </tbody>
      </table>
    </div>`;
};

window.Views['categories-inv'].afterMount = loadCategories;

// ---- UBICACIONES ----
function locationFormHTML(l) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div><label class="text-sm font-medium">Código <span class="text-xs text-muted-foreground">(asignado automáticamente)</span></label>
        <input id="loc-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly value="${l ? (l.codigo || '') : ''}"></div>
      <div><label class="text-sm font-medium">Nombre <span class="text-destructive">*</span></label>
        <input id="loc-nombre" class="input mt-1 w-full" placeholder="Ej: Aula 305" value="${l ? l.nombre : ''}"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Tipo</label>
            <select id="loc-tipo" class="select mt-1 w-full" onchange="generateLocCode()">
            ${['Aula','Laboratorio','Depósito','Oficina','Otro'].map(t => `<option value="${t}" ${l && l.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select></div>
        <div><label class="text-sm font-medium">Sede <span class="text-destructive">*</span></label>
            <select id="loc-sede" class="select mt-1 w-full" onchange="generateLocCode()">
            <option value="">Seleccione sede...</option>
            ${(window._allSedes || []).map(s => `<option value="${s.id}" ${l && l.sede_id == s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}
            </select></div>
      </div>
    </div>`;
}

async function loadLocations() {
  const tbody = document.getElementById('locations-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/locations.php').then(r => r.json());
    if (!data.locations || data.locations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-muted-foreground">No hay ubicaciones registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = data.locations.map(l => `
      <tr>
        <td class="font-mono text-xs">${l.codigo || '—'}</td>
        <td class="font-medium">${l.nombre}</td>
        <td>
            <div class="text-sm">${l.tipo || '—'}</div>
            <div class="text-[10px] font-bold text-primary uppercase">${l.sede_nombre || 'Sin Sede'}</div>
        </td>
        <td>${l.responsable_nombre || '<span class="text-muted-foreground">—</span>'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editLocation(${l.id}, '${(l.codigo||'').replace(/'/g,"\\'")}', '${l.nombre.replace(/'/g,"\\'")}', '${(l.tipo||'').replace(/'/g,"\\'")}', ${l.sede_id || 'null'})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteLocation(${l.id}, '${l.nombre.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

async function prepareLocationModal() {
    if (!window._allSedes) {
        const resp = await fetch('api/sedes.php').then(r => r.json());
        window._allSedes = resp.sedes || [];
    }
}
window.generateLocCode = async function() {
    const sede_id = document.getElementById('loc-sede').value;
    const tipo = document.getElementById('loc-tipo').value;
    if (!sede_id || !tipo) return;
    try {
        const resp = await fetch(`api/locations.php?action=next_code&sede_id=${sede_id}&tipo=${tipo}`).then(r => r.json());
        if (resp.next_code) document.getElementById('loc-codigo').value = resp.next_code;
    } catch(e) {}
};

window.newLocation = async function() {
  await prepareLocationModal();
  let nextCode = '';
  try {
    const r = await fetch('api/locations.php?action=next_code');
    const d = await r.json();
    nextCode = d.next_code || '';
  } catch { /* vacío */ }
  UI.modal({
    title: 'Nueva ubicación', body: locationFormHTML({ codigo: nextCode, nombre: '', tipo: 'Aula' }), confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('loc-nombre').value.trim();
      const sede_id = document.getElementById('loc-sede').value;
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return; }
      const resp = await fetch('api/locations.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: document.getElementById('loc-codigo').value.trim(), nombre, tipo: document.getElementById('loc-tipo').value, sede_id }) });
      const res = await resp.json();
      if (res.ok) { UI.toast('Ubicación creada', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.editLocation = async function(id, codigo, nombre, tipo, sede_id) {
  await prepareLocationModal();
  UI.modal({
    title: 'Editar ubicación', body: locationFormHTML({ id, codigo, nombre, tipo, sede_id }), confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const newNombre = document.getElementById('loc-nombre').value.trim();
      const newSedeId = document.getElementById('loc-sede').value;
      if (!newNombre || !newSedeId) { UI.toast('Nombre y Sede son obligatorios', 'error'); return; }
      const resp = await fetch('api/locations.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, codigo: document.getElementById('loc-codigo').value.trim(), nombre: newNombre, tipo: document.getElementById('loc-tipo').value, sede_id: newSedeId }) });
      const res = await resp.json();
      if (res.ok) { UI.toast('Ubicación actualizada', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.deleteLocation = function(id, nombre) {
  UI.modal({
    title: 'Eliminar ubicación',
    body: `<p>¿Eliminar la ubicación <strong>${nombre}</strong>?</p>`,
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
    ${UI.pageHeader('Ubicaciones','Aulas, laboratorios y áreas del colegio', `
      <button class="btn btn-primary" onclick="newLocation()"><i data-lucide="plus"></i>Nueva ubicación</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Responsable</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="locations-table-body"><tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.locations.afterMount = loadLocations;
 
 
// ---- ÁREAS (Departamentos que solicitan compras) ----
function areaFormHTML(a) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="text-sm font-medium">Código <span class="text-xs text-muted-foreground">(automático)</span></label>
          <input id="area-codigo" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly value="${a ? (a.codigo || '') : ''}"></div>
        <div><label class="text-sm font-medium">Sede <span class="text-destructive">*</span></label>
            <select id="area-sede" class="select mt-1 w-full" onchange="generateAreaCode()">
            <option value="">Seleccione sede...</option>
            ${(window._allSedes || []).map(s => `<option value="${s.id}" ${a && a.sede_id == s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}
            </select></div>
      </div>
      <div><label class="text-sm font-medium">Nombre de Área <span class="text-destructive">*</span></label>
        <input id="area-nombre" class="input mt-1 w-full" placeholder="Ej: Sistemas" value="${a ? a.nombre : ''}"></div>
      <div><label class="text-sm font-medium">Descripción</label>
        <input id="area-descripcion" class="input mt-1 w-full" placeholder="Breve detalle..." value="${a ? (a.descripcion || '') : ''}"></div>
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

async function loadAreas() {
  const tbody = document.getElementById('areas-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/areas.php').then(r => r.json());
    if (!data.areas || data.areas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center py-10 text-muted-foreground">No hay áreas registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = data.areas.map(a => `
      <tr>
        <td class="font-mono text-xs">
            <div class="font-bold">${a.codigo || '—'}</div>
            <div class="text-[10px] text-primary uppercase">${a.sede_nombre || 'Sin Sede'}</div>
        </td>
        <td class="font-medium">${a.nombre}</td>
        <td class="text-muted-foreground text-sm">${a.descripcion || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editArea(${a.id}, '${(a.codigo||'').replace(/'/g,"\\'")}', '${a.nombre.replace(/'/g,"\\'")}', '${(a.descripcion||'').replace(/'/g,"\\'")}', ${a.sede_id || 'null'})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteArea(${a.id}, '${a.nombre.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

window.newArea = async function() {
  if (!window._allSedes) {
    const resp = await fetch('api/sedes.php').then(r => r.json());
    window._allSedes = resp.sedes || [];
  }
  UI.modal({
    title: 'Nueva área', body: areaFormHTML(null), confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre = document.getElementById('area-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const resp = await fetch('api/areas.php', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              codigo: document.getElementById('area-codigo').value.trim(),
              nombre, 
              descripcion: document.getElementById('area-descripcion').value.trim(),
              sede_id: document.getElementById('area-sede').value
          }) 
      });
      const res = await resp.json();
      if (res.ok) { UI.toast('Área creada', 'success'); loadAreas(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.editArea = async function(id, codigo, nombre, descripcion, sede_id) {
  if (!window._allSedes) {
    const resp = await fetch('api/sedes.php').then(r => r.json());
    window._allSedes = resp.sedes || [];
  }
  UI.modal({
    title: 'Editar área', body: areaFormHTML({ id, codigo, nombre, descripcion, sede_id }), confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const newNombre = document.getElementById('area-nombre').value.trim();
      if (!newNombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const resp = await fetch('api/areas.php', { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              id, 
              codigo: document.getElementById('area-codigo').value.trim(),
              nombre: newNombre, 
              descripcion: document.getElementById('area-descripcion').value.trim(),
              sede_id: document.getElementById('area-sede').value
          }) 
      });
      const res = await resp.json();
      if (res.ok) { UI.toast('Área actualizada', 'success'); loadAreas(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.deleteArea = function(id, nombre) {
  UI.modal({ title: 'Eliminar área', body: `<p>¿Eliminar el área <strong>${nombre}</strong>?</p>`, confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/areas.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Área eliminada', 'success'); loadAreas(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.areas = function() {
  return `
    ${UI.pageHeader('Áreas / Departamentos','Oficinas y áreas solicitantes del colegio', `
      <button class="btn btn-primary" onclick="newArea()"><i data-lucide="plus"></i>Nueva área</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Nombre</th><th>Descripción</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="areas-table-body"><tr><td colspan="3" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.areas.afterMount = loadAreas;


// ---- GESTIÓN DE INSUMOS / MOVIMIENTOS ----
let _allMovements = [];

function renderMovementRows(items) {
  const tbody = document.getElementById('movements-table-body');
  if (!tbody) return;
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No se encontraron movimientos.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(m => `
    <tr>
      <td class="text-xs text-muted-foreground">${m.fecha || '—'}</td>
      <td><span class="badge ${m.tipo === 'Entrada' ? 'badge-green' : 'badge-red'}">${m.tipo}</span></td>
      <td class="font-medium">${m.item_nombre}</td>
      <td class="font-bold ${m.tipo === 'Entrada' ? 'text-green-500' : 'text-red-500'}">${m.tipo === 'Entrada' ? '+' : '-'}${m.cantidad}</td>
      <td>${m.responsable_nombre || '<span class="text-muted-foreground">—</span>'}</td>
      <td class="text-sm text-muted-foreground max-w-xs truncate">${m.observacion || '—'}</td>
    </tr>`).join('');
}

function applyMovementFilters() {
  const q = (document.getElementById('mov-search')?.value || '').toLowerCase();
  const tipo = document.getElementById('mov-tipo-filter')?.value || '';
  const filtered = _allMovements.filter(m => {
    const matchQ = !q || (m.item_nombre || '').toLowerCase().includes(q) || (m.responsable_nombre || '').toLowerCase().includes(q);
    const matchTipo = !tipo || m.tipo === tipo;
    return matchQ && matchTipo;
  });
  renderMovementRows(filtered);
}

window.Views.movements = function() {
  return `
    ${UI.pageHeader('Gestión de Insumos','Entradas y salidas de stock', `
      <div class="relative">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></i>
        <input id="mov-search" class="input pl-9 w-52" placeholder="Buscar ítem o responsable...">
      </div>
      <select id="mov-tipo-filter" class="select w-36">
        <option value="">Todos los tipos</option>
        <option value="Entrada">Entradas</option>
        <option value="Salida">Salidas</option>
      </select>
      <button class="btn btn-primary" onclick="newMovement()"><i data-lucide="plus"></i>Registrar movimiento</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Ítem</th><th>Cantidad</th><th>Responsable</th><th>Observación</th></tr></thead>
        <tbody id="movements-table-body">
          <tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
        </tbody>
      </table>
    </div>`;
};

window.Views.movements.afterMount = async function() {
  try {
    const data = await fetch('api/movements.php').then(r => r.json());
    _allMovements = data.movements || [];

    document.getElementById('mov-search')?.addEventListener('input', applyMovementFilters);
    document.getElementById('mov-tipo-filter')?.addEventListener('change', applyMovementFilters);

    if (_allMovements.length === 0) {
      document.getElementById('movements-table-body').innerHTML =
        '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay movimientos registrados aún.</td></tr>';
      return;
    }
    renderMovementRows(_allMovements);
  } catch {
    document.getElementById('movements-table-body').innerHTML =
      '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>';
  }
};

window.newMovement = async function() {
  const [itemsData, staffData] = await Promise.all([
    fetch('api/items.php').then(r => r.json()).catch(() => ({ items: [] })),
    fetch('api/staff.php').then(r => r.json()).catch(() => ({ staff: [] }))
  ]);

  UI.modal({
    title: 'Registrar movimiento',
    body: `
      <div class="grid grid-cols-1 gap-4">
        <div><label class="text-sm font-medium">Tipo <span class="text-destructive">*</span></label>
          <select id="mov-tipo" class="select mt-1 w-full">
            <option value="Entrada">Entrada (ingreso de stock)</option>
            <option value="Salida">Salida (consumo de stock)</option>
          </select></div>
        <div><label class="text-sm font-medium">Ítem <span class="text-destructive">*</span></label>
          <select id="mov-item" class="select mt-1 w-full">
            <option value="">Seleccione un ítem</option>
            ${itemsData.items.map(i => `<option value="${i.id}">${i.codigo ? i.codigo + ' — ' : ''}${i.nombre}</option>`).join('')}
          </select></div>
        <div><label class="text-sm font-medium">Cantidad <span class="text-destructive">*</span></label>
          <input id="mov-cantidad" type="number" min="1" class="input mt-1 w-full" placeholder="Ej: 10"></div>
        <div><label class="text-sm font-medium">Responsable</label>
          <select id="mov-responsable" class="select mt-1 w-full">
            <option value="">Sin asignar</option>
            ${staffData.staff.map(s => `<option value="${s.id}">${s.nombre}${s.cargo ? ' — ' + s.cargo : ''}</option>`).join('')}
          </select></div>
        <div><label class="text-sm font-medium">Observación</label>
          <textarea id="mov-obs" class="textarea mt-1 w-full" placeholder="Motivo, detalle del movimiento..."></textarea></div>
      </div>`,
    confirmText: 'Registrar',
    onConfirm: async () => {
      const item_id = document.getElementById('mov-item').value;
      const cantidad = parseInt(document.getElementById('mov-cantidad').value);
      if (!item_id) { UI.toast('Seleccione un ítem', 'error'); return; }
      if (!cantidad || cantidad < 1) { UI.toast('La cantidad debe ser mayor a 0', 'error'); return; }

      const body = {
        item_id,
        tipo: document.getElementById('mov-tipo').value,
        cantidad,
        responsable_id: document.getElementById('mov-responsable').value || null,
        observacion: document.getElementById('mov-obs').value.trim()
      };

      try {
        const resp = await fetch('api/movements.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const res = await resp.json();
        if (res.ok) {
          UI.toast('Movimiento registrado correctamente', 'success');
          // Refrescar lista
          const fresh = await fetch('api/movements.php').then(r => r.json());
          _allMovements = fresh.movements || [];
          applyMovementFilters();
        } else UI.toast('Error: ' + res.error, 'error');
      } catch { UI.toast('Error de conexión', 'error'); }
    }
  });
};


window.Views.maintenance = function() {
  return tableView('Mantenimientos','Historial y solicitudes de mantenimiento',
    ['Fecha','Activo','Tipo','Técnico','Estado'],
    [
      ['2026-05-01','Proyector Epson X51','Preventivo','C. Vega','<span class="badge badge-green">Completado</span>'],
      ['2026-05-03','Laptop Dell L-204','Correctivo','C. Vega','<span class="badge badge-yellow">En proceso</span>'],
      ['2026-05-05','Impresora HP','Preventivo','—','<span class="badge badge-blue">Programado</span>'],
    ], 'Nueva orden');
};

// ---- PROVEEDORES ----
function supplierFormHTML(s, categories) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div><label class="text-sm font-medium">RUC <span class="text-destructive">*</span></label>
        <input id="sup-ruc" class="input mt-1 w-full" placeholder="20512345678" maxlength="11" value="${s ? s.ruc : ''}"></div>
      <div><label class="text-sm font-medium">Razón Social <span class="text-destructive">*</span></label>
        <input id="sup-razon" class="input mt-1 w-full" placeholder="Empresa S.A.C." value="${s ? s.razon_social : ''}"></div>
      <div><label class="text-sm font-medium">Contacto</label>
        <input id="sup-contacto" class="input mt-1 w-full" placeholder="Juan Pérez" value="${s ? (s.contacto || '') : ''}"></div>
      <div><label class="text-sm font-medium">Teléfono</label>
        <input id="sup-telefono" class="input mt-1 w-full" placeholder="987654321" value="${s ? (s.telefono || '') : ''}"></div>
      <div><label class="text-sm font-medium">Rubro</label>
        <select id="sup-cat" class="select mt-1 w-full">
          <option value="">Sin rubro</option>
          ${categories.map(c => `<option value="${c.id}" ${s && s.rubro_id == c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
        </select></div>
      <div class="md:col-span-2"><label class="text-sm font-medium">Dirección</label>
        <input id="sup-direccion" class="input mt-1 w-full" placeholder="Calle Ejemplo 123" value="${s ? (s.direccion || '') : ''}"></div>
    </div>`;
}

async function loadSuppliers() {
  const tbody = document.getElementById('suppliers-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/suppliers.php').then(r => r.json());
    if (!data.suppliers || data.suppliers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay proveedores registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.suppliers.map(s => `
      <tr>
        <td class="font-mono text-xs">${s.ruc}</td>
        <td class="font-medium">${s.razon_social}</td>
        <td class="text-xs text-muted-foreground">${s.direccion || '—'}</td>
        <td>${s.contacto || '—'}</td>
        <td>${s.telefono || '—'}</td>
        <td>${s.categoria_nombre || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editSupplier(${s.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteSupplier(${s.id}, '${s.razon_social.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

async function openSupplierModal(sData) {
  const catData = await fetch('api/rubros.php').then(r => r.json()).catch(() => ({ categories: [] }));
  const body = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Razón Social <span class="text-destructive">*</span></label>
        <input id="sup-razon" class="input mt-1 w-full" value="${sData ? sData.razon_social : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">RUC <span class="text-destructive">*</span></label>
        <input id="sup-ruc" class="input mt-1 w-full" value="${sData ? sData.ruc : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Email Proveedor</label>
        <input id="sup-email" type="email" class="input mt-1 w-full" value="${sData ? (sData.email || '') : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Banco</label>
        <select id="sup-banco" class="select mt-1 w-full">
          <option value="">Seleccione banco...</option>
          ${['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'BanBif', 'Banco de la Nación', 'Otro'].map(b => `<option value="${b}" ${sData && sData.banco == b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">N° Cuenta Bancaria</label>
        <input id="sup-cuenta" class="input mt-1 w-full font-mono" value="${sData ? (sData.numero_cuenta || '') : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">CCI (Interbancario)</label>
        <input id="sup-cci" class="input mt-1 w-full font-mono" value="${sData ? (sData.cci || '') : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Cuenta de Detracción <span class="text-[10px] text-muted-foreground font-normal">(opcional)</span></label>
        <input id="sup-detraccion" class="input mt-1 w-full font-mono" placeholder="Ej: 00-123456-7" value="${sData ? (sData.cuenta_detraccion || '') : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Contacto (Nombre)</label>
        <input id="sup-contacto" class="input mt-1 w-full" value="${sData ? sData.contacto : ''}">
      </div>
      <div>
        <label class="text-sm font-medium">Teléfono</label>
        <input id="sup-telefono" class="input mt-1 w-full" value="${sData ? sData.telefono : ''}">
      </div>
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Dirección</label>
        <input id="sup-direccion" class="input mt-1 w-full" value="${sData ? sData.direccion : ''}">
      </div>
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Rubro Comercial</label>
        <select id="sup-cat" class="select mt-1 w-full">
          <option value="">Seleccione rubro...</option>
          ${catData.categories.map(c => `<option value="${c.id}" ${sData && sData.rubro_id == c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
        </select>
      </div>
    </div>`;

  UI.modal({
    title: sData ? 'Editar proveedor' : 'Nuevo proveedor',
    body,
    confirmText: sData ? 'Guardar' : 'Registrar',
    onConfirm: async () => {
      const ruc = document.getElementById('sup-ruc').value.trim();
      const razon = document.getElementById('sup-razon').value.trim();
      if (!ruc || !razon) { UI.toast('RUC y Razón Social son obligatorios', 'error'); return; }
      const bodyData = { 
        ruc, 
        razon_social: razon, 
        banco: document.getElementById('sup-banco').value,
        numero_cuenta: document.getElementById('sup-cuenta').value.trim(),
        cci: document.getElementById('sup-cci').value.trim(),
        cuenta_detraccion: document.getElementById('sup-detraccion').value.trim() || null,
        email: document.getElementById('sup-email').value.trim(),
        contacto: document.getElementById('sup-contacto').value.trim(), 
        telefono: document.getElementById('sup-telefono').value.trim(), 
        direccion: document.getElementById('sup-direccion').value.trim(),
        rubro_id: document.getElementById('sup-cat').value 
      };
      if (sData) bodyData.id = sData.id;
      const resp = await fetch('api/suppliers.php', { method: sData ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      const res = await resp.json();
      if (res.ok) { UI.toast(sData ? 'Proveedor actualizado' : 'Proveedor registrado', 'success'); loadSuppliers(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
}

window.newSupplier = () => openSupplierModal(null);
window.editSupplier = async function(id) {
  const data = await fetch('api/suppliers.php').then(r => r.json());
  const s = data.suppliers.find(x => x.id == id);
  if (s) openSupplierModal(s);
};
window.deleteSupplier = function(id, nombre) {
  UI.modal({ title: 'Eliminar proveedor', body: `<p>¿Eliminar a <strong>${nombre}</strong>?</p>`, confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/suppliers.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Proveedor eliminado', 'success'); loadSuppliers(); }
    }
  });
};

window.Views.suppliers = function() {
  return `
    ${UI.pageHeader('Proveedores','Empresas y contactos comerciales', `
      <button class="btn btn-primary" onclick="newSupplier()"><i data-lucide="plus"></i>Nuevo proveedor</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>RUC</th><th>Razón Social</th><th>Dirección</th><th>Contacto</th><th>Teléfono</th><th>Rubro</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="suppliers-table-body"><tr><td colspan="7" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.suppliers.afterMount = loadSuppliers;

// ---- ÓRDENES DE COMPRA ----
const OC_ESTADOS = ['Pendiente','Aprobada','Rechazada', 'Recibida'];
const OC_BADGE = { 'Pendiente': 'badge-yellow', 'Aprobada': 'badge-green', 'Rechazada': 'badge-red', 'Recibida': 'badge-blue' };

let _allPurchases = [];

async function loadPurchases() {
  const tbody = document.getElementById('purchases-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/purchases.php').then(r => r.json());
    _allPurchases = data.purchases || [];
    renderPurchasesTable(_allPurchases);
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

function renderPurchasesTable(list) {
  const tbody = document.getElementById('purchases-table-body');
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No se encontraron órdenes.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td class="font-mono text-xs font-bold">${p.numero_oc}</td>
      <td class="font-medium">${p.proveedor_nombre}</td>
      <td class="text-xs">
        <div>${p.fecha || '—'}</div>
        <div class="text-[10px] text-muted-foreground font-semibold uppercase">${p.area_nombre || '—'}</div>
      </td>
      <td class="font-semibold">S/ ${parseFloat(p.monto || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</td>
      <td>
        <div class="flex flex-col gap-1">
          <span class="badge ${OC_BADGE[p.estado] || 'badge-gray'}">${p.estado}</span>
          <div class="flex flex-col gap-0.5 mt-1">
            <div class="flex items-center gap-1 text-[10px] ${p.rechazado_gerente ? 'text-destructive font-bold' : (p.aprobado_gerente ? 'text-green-600 font-bold' : 'text-gray-400')}">
              <i data-lucide="${p.rechazado_gerente ? 'x' : (p.aprobado_gerente ? 'check' : 'clock')}" class="w-3 h-3"></i> Gerente G.
            </div>
            <div class="flex items-center gap-1 text-[10px] ${p.rechazado_finanzas ? 'text-destructive font-bold' : (p.aprobado_finanzas ? 'text-green-600 font-bold' : 'text-gray-400')}">
              <i data-lucide="${p.rechazado_finanzas ? 'x' : (p.aprobado_finanzas ? 'check' : 'clock')}" class="w-3 h-3"></i> J. Finanzas
            </div>
          </div>
        </div>
      </td>
      <td class="text-right">
        ${p.estado === 'Aprobada' && p.pagado && !p.fecha_recepcion ? `
          <button class="btn btn-ghost p-1.5 text-blue-600" onclick="openReceiveModal(${p.id}, '${p.numero_oc}', '${p.fecha_pago}')" title="Registrar Recepción">
            <i data-lucide="package-check" class="w-4 h-4"></i>
          </button>
        ` : ''}
        <button class="btn btn-ghost p-1.5" onclick="editPurchase(${p.id})" title="${Auth.getUser()?.role === 'admin' ? 'Editar' : 'Ver Detalle'}">
            <i data-lucide="${Auth.getUser()?.role === 'admin' ? 'pencil' : 'eye'}" class="w-4 h-4"></i>
        </button>
        ${Auth.getUser()?.role === 'admin' ? `
            <button class="btn btn-ghost p-1.5 text-destructive" onclick="deletePurchase(${p.id}, '${p.numero_oc}')" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        ` : ''}
      </td>
    </tr>`).join('');
  lucide.createIcons();
}

window.filterPurchases = function() {
    const code = document.getElementById('filter-oc-code').value.toLowerCase();
    const sup = document.getElementById('filter-oc-supplier').value.toLowerCase();
    const date = document.getElementById('filter-oc-date').value;
    const status = document.getElementById('filter-oc-status').value;

    const filtered = _allPurchases.filter(p => {
        const matchCode = !code || p.numero_oc.toLowerCase().includes(code);
        const matchSup = !sup || p.proveedor_nombre.toLowerCase().includes(sup);
        const matchDate = !date || p.fecha === date;
        const matchStatus = !status || p.estado === status;
        return matchCode && matchSup && matchDate && matchStatus;
    });

    renderPurchasesTable(filtered);
};

async function openPurchaseModal(pData) {
  const id = pData ? pData.id : null;
  const [suppData, areaData, fullData] = await Promise.all([
    fetch('api/suppliers.php').then(r => r.json()).catch(() => ({ suppliers: [] })),
    fetch('api/areas.php').then(r => r.json()).catch(() => ({ areas: [] })),
    id ? fetch(`api/purchases.php?id=${id}`).then(r => r.json()).catch(() => null) : null
  ]);

  const p = (fullData && fullData.purchase) ? fullData.purchase : pData;
  const cuotas = p?.cuotas || [];
  
  // Generar sección de estado de pago (solo si existe pData)
  let paymentSection = '';
  if (pData) {
      paymentSection = `
      <div class="mt-6 border-t pt-6">
        <h4 class="text-sm font-bold flex items-center gap-2 mb-4 text-primary">
            <i data-lucide="wallet" class="w-4 h-4"></i> Seguimiento de Pagos
        </h4>
        ${getPaymentProgressHTML(p, cuotas)}
      </div>`;
  }

  const isAdmin = Auth.getUser()?.role === 'admin';
  const readonly = !isAdmin ? 'readonly' : '';
  const disabled = !isAdmin ? 'disabled' : '';

  const body = `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${pData ? `<div><label class="text-sm font-medium">N° OC <span class="text-xs text-muted-foreground">(automático)</span></label><input class="input mt-1 w-full bg-muted cursor-not-allowed" readonly value="${pData.numero_oc}"></div>` : ''}
      <div><label class="text-sm font-medium">Proveedor <span class="text-destructive">*</span></label>
        <select id="pur-supplier" class="select mt-1 w-full" ${disabled}>
          <option value="">Seleccione proveedor</option>
          ${suppData.suppliers.map(s => `<option value="${s.id}" ${p && p.proveedor_id == s.id ? 'selected' : ''}>${s.razon_social}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Área Solicitante <span class="text-destructive">*</span></label>
        <select id="pur-area" class="select mt-1 w-full" ${disabled}>
          <option value="">Seleccione área...</option>
          ${areaData.areas.map(a => `<option value="${a.id}" ${p && p.area_id == a.id ? 'selected' : ''}>${a.nombre}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Fecha</label>
        <input id="pur-fecha" type="date" class="input mt-1 w-full" value="${p ? p.fecha : new Date().toISOString().split('T')[0]}" ${readonly}></div>
      <div><label class="text-sm font-medium">Monto (S/)</label>
        <input id="pur-monto" type="number" step="0.01" class="input mt-1 w-full" placeholder="0.00" value="${p ? p.monto : ''}" ${readonly}></div>
      <div><label class="text-sm font-medium">Estado</label>
        <select id="pur-estado" class="select mt-1 w-full" ${disabled}>
          ${OC_ESTADOS.map(e => `<option value="${e}" ${p && p.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select></div>
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Observaciones / Sustento</label>
        <textarea id="pur-obs" class="textarea mt-1 w-full h-20 resize-none" placeholder="Opcional..." ${readonly}>${p ? (p.observaciones || '') : ''}</textarea>
      </div>
    </div>
    ${paymentSection}
    </div>`;
  UI.modal({
    title: pData ? (isAdmin ? 'Editar orden' : 'Detalle de Orden') : 'Nueva orden de compra', 
    body,
    confirmText: isAdmin ? (pData ? 'Guardar cambios' : 'Crear orden') : 'Cerrar',
    onConfirm: async () => {
      if (!isAdmin) { document.getElementById('modal-overlay')?.remove(); return; }
      
      const proveedor_id = document.getElementById('pur-supplier').value;
      const area_id = document.getElementById('pur-area').value;
      if (!proveedor_id) { UI.toast('Seleccione un proveedor', 'error'); return; }
      if (!area_id) { UI.toast('Seleccione el área solicitante', 'error'); return; }
      const payload = { 
        proveedor_id, 
        area_id,
        fecha: document.getElementById('pur-fecha').value, 
        monto: document.getElementById('pur-monto').value, 
        estado: document.getElementById('pur-estado').value,
        observaciones: document.getElementById('pur-obs').value.trim()
      };
      if (pData) payload.id = pData.id;
      const resp = await fetch('api/purchases.php', { method: pData ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const res = await resp.json();
      if (res.ok) { 
        UI.toast(pData ? 'Orden actualizada' : `Orden ${res.numero_oc} creada`, 'success'); 
        document.getElementById('modal-overlay')?.remove();
        loadPurchases(); 
      }
      else UI.toast('Error: ' + res.error, 'error');
    },
    extraButtons: pData ? [
      {
        text: 'Exportar PDF',
        class: 'btn-outline',
        icon: 'file-text',
        onClick: () => window.generateOC(pData.id)
      },
      {
        text: 'Subir a Drive',
        class: 'btn-outline',
        icon: 'upload-cloud',
        onClick: () => window.exportOCById(pData.id)
      },
      ...(isAdmin ? [{
        text: 'Eliminar Orden',
        class: 'btn-ghost text-destructive hover:bg-destructive/10',
        icon: 'trash-2',
        onClick: () => {
            // No cerrar aquí, el confirm de deletePurchase se encargará o lo cerramos manual para evitar overlays dobles
            window.deletePurchase(pData.id, pData.numero_oc);
        }
      }] : [])
    ] : []
  });
  lucide.createIcons();
}

function getPaymentProgressHTML(p, cuotas) {
    const monSym = p.moneda === 'USD' ? '$' : (p.moneda === 'EUR' ? '€' : 'S/');
    
    // Si la orden NO está aprobada, mostrar estado de aprobación
    if (p.estado === 'Pendiente') {
        return `
        <div class="p-4 rounded-xl border bg-orange-50 border-orange-200">
            <h4 class="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                <i data-lucide="clock" class="w-4 h-4"></i> ESPERANDO APROBACIÓN
            </h4>
            <p class="text-xs text-orange-700 mb-3">Esta orden aún no puede ser procesada por Tesorería porque faltan las siguientes aprobaciones:</p>
            <div class="space-y-2">
                <div class="flex items-center gap-2 text-[11px] ${p.aprobado_gerente ? 'text-green-700 font-bold' : 'text-orange-600'}">
                    <i data-lucide="${p.aprobado_gerente ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5"></i>
                    Gerente General: ${p.aprobado_gerente ? 'APROBADO' : 'PENDIENTE'}
                </div>
                <div class="flex items-center gap-2 text-[11px] ${p.aprobado_finanzas ? 'text-green-700 font-bold' : 'text-orange-600'}">
                    <i data-lucide="${p.aprobado_finanzas ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5"></i>
                    Jefe de Finanzas: ${p.aprobado_finanzas ? 'APROBADO' : 'PENDIENTE'}
                </div>
            </div>
        </div>`;
    }

    if (p.estado === 'Rechazada') {
        return `
        <div class="p-4 rounded-xl border bg-red-50 border-red-200">
            <h4 class="text-sm font-bold text-red-800 mb-1 flex items-center gap-2">
                <i data-lucide="x-circle" class="w-4 h-4"></i> ORDEN RECHAZADA
            </h4>
            <p class="text-xs text-red-700">Esta orden fue rechazada y no procederá a pago.</p>
        </div>`;
    }
    
    // CASO 1: ADELANTO + SALDO
    if (p.condicion_pago === 'Adelanto + Saldo') {
        const isAdelantoPagado = p.adelanto_pagado == 1;
        const isTotalPagado = p.pagado == 1;
        return `
        <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-lg border ${isAdelantoPagado ? 'bg-green-50 border-green-200' : 'bg-white border-border shadow-sm'}">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${isAdelantoPagado ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}">
                        ${isAdelantoPagado ? '✓' : '1'}
                    </div>
                    <div>
                        <div class="text-xs font-bold uppercase">Adelanto (${p.adelanto_porcentaje}%)</div>
                        <div class="text-[10px] ${isAdelantoPagado ? 'text-green-700' : 'text-muted-foreground'}">
                            ${isAdelantoPagado ? 'Pagado el ' + new Date(p.adelanto_fecha).toLocaleDateString() : 'Pendiente de pago'}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <div class="font-bold text-sm ${isAdelantoPagado ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.adelanto_monto).toFixed(2)}</div>
                    ${isAdelantoPagado ? `
                        <button class="btn btn-outline h-6 px-2 text-[9px] border-green-600 text-green-700 hover:bg-green-50" onclick="sendPaymentNotification(${p.id}, 'adelanto')">
                            <i data-lucide="mail" class="w-3 h-3 mr-1"></i> Enviar Correo
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg border ${isTotalPagado ? 'bg-green-50 border-green-200' : 'bg-white border-border shadow-sm'}">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${isTotalPagado ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}">
                        ${isTotalPagado ? '✓' : '2'}
                    </div>
                    <div>
                        <div class="text-xs font-bold uppercase">Saldo Final</div>
                        <div class="text-[10px] ${isTotalPagado ? 'text-green-700' : 'text-muted-foreground'}">
                            ${isTotalPagado ? 'Pagado el ' + new Date(p.fecha_pago).toLocaleDateString() : (isAdelantoPagado ? 'Pendiente tras entrega' : 'Esperando adelanto')}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <div class="font-bold text-sm ${isTotalPagado ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.saldo_monto).toFixed(2)}</div>
                    ${isTotalPagado ? `
                        <button class="btn btn-outline h-6 px-2 text-[9px] border-green-600 text-green-700 hover:bg-green-50" onclick="sendPaymentNotification(${p.id}, 'saldo')">
                            <i data-lucide="mail" class="w-3 h-3 mr-1"></i> Enviar Correo
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }

    // CASO 2: CUOTAS
    if (cuotas.length > 0) {
        const pagadas = cuotas.filter(c => c.pagado == 1).length;
        const cuotasList = cuotas.map(c => {
            const isPagada = c.pagado == 1;
            const vence = new Date(c.fecha_vencimiento);
            const hoy = new Date();
            const estaVencida = !isPagada && vence < hoy;
            
            return `
            <div class="flex items-center justify-between p-2 border-b border-muted/50 last:border-0">
                <div class="flex items-center gap-2">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isPagada ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}">
                        ${c.numero_cuota}
                    </div>
                    <div>
                        <div class="text-[10px] font-bold ${isPagada ? 'text-green-700' : (estaVencida ? 'text-red-600' : '')}">Cuota ${c.numero_cuota}</div>
                        <div class="text-[9px] text-muted-foreground">Vence: ${vence.toLocaleDateString()} ${isPagada ? '· Pagado' : ''}</div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <div class="text-[10px] font-bold">${monSym} ${parseFloat(c.monto_cuota).toFixed(2)}</div>
                    ${isPagada ? `
                        <button class="btn btn-outline h-5 px-1.5 text-[8px] border-green-600 text-green-700 hover:bg-green-50" onclick="sendPaymentNotification(${p.id}, 'cuota', ${c.id})">
                            <i data-lucide="mail" class="w-2.5 h-2.5 mr-1"></i> Notificar Pago
                        </button>
                    ` : (estaVencida ? '<div class="text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold uppercase">Atrasado</div>' : '')}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="space-y-2">
            <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-semibold">Progreso de pagos</span>
                <span class="font-bold text-primary">${pagadas} de ${cuotas.length}</span>
            </div>
            <div class="w-full bg-muted rounded-full h-1.5 mb-4">
                <div class="bg-primary h-1.5 rounded-full transition-all" style="width:${(pagadas/cuotas.length*100)}%"></div>
            </div>
            <div class="max-h-48 overflow-y-auto border rounded-lg bg-muted/10 p-1">
                ${cuotasList}
            </div>
        </div>`;
    }

    // CASO 3: AL CONTADO / OTROS
    return `
    <div class="p-4 rounded-xl border ${p.pagado == 1 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}">
        <div class="flex items-center justify-between">
            <div>
                <div class="text-sm font-bold ${p.pagado == 1 ? 'text-green-700' : 'text-yellow-700'}">${p.pagado == 1 ? 'Totalmente Pagado' : 'Pendiente de Pago'}</div>
                <p class="text-xs text-muted-foreground mt-1">${p.pagado == 1 ? 'El pago se realizó el ' + new Date(p.fecha_pago).toLocaleDateString() : 'La orden está aprobada y esperando ser procesada por Tesorería.'}</p>
            </div>
            <div class="text-right flex flex-col items-end gap-2">
                <div class="text-lg font-black ${p.pagado == 1 ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.monto).toFixed(2)}</div>
                ${p.pagado == 1 ? `
                    <button class="btn btn-outline h-7 px-3 text-xs border-green-600 text-green-700 hover:bg-green-50" onclick="sendPaymentNotification(${p.id}, 'contado')">
                        <i data-lucide="mail" class="w-3.5 h-3.5 mr-1"></i> Enviar Comprobante al Proveedor
                    </button>
                ` : ''}
            </div>
        </div>
    </div>`;
}

window.sendPaymentNotification = async function(id, type, paymentId = null) {
    UI.modal({
        title: 'Confirmar Notificación',
        body: `
            <div class="text-center py-4">
                <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="mail-check" class="w-8 h-8"></i>
                </div>
                <h3 class="text-lg font-bold mb-2">¿Enviar comprobante al proveedor?</h3>
                <p class="text-sm text-muted-foreground">
                    Se enviará un correo formal con el voucher de pago y copia automática a 
                    <span class="font-bold text-primary">compras@colegiolacatolica.edu.pe</span>.
                </p>
            </div>
        `,
        confirmText: 'Sí, enviar ahora',
        cancelText: 'Cancelar',
        onConfirm: async () => {
            UI.toast('Enviando correo...', 'info');
            try {
                const resp = await fetch('api/purchases.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'notify_payment',
                        id,
                        payment_type: type,
                        payment_id: paymentId
                    })
                }).then(r => r.json());

                if (resp.ok) {
                    UI.toast('Correo enviado correctamente al proveedor', 'success');
                } else {
                    UI.toast('Error: ' + (resp.error || 'No se pudo enviar el correo'), 'error');
                }
            } catch (err) {
                UI.toast('Error de conexión con el servidor', 'error');
                console.error(err);
            }
        }
    });
    lucide.createIcons();
};

window.newPurchase = () => openPurchaseModal(null);
window.editPurchase = async function(id) {
  const data = await fetch('api/purchases.php').then(r => r.json());
  const p = data.purchases.find(x => x.id == id);
  if (p) openPurchaseModal(p);
};
let _allRecepcionsData = [];
window.openReceiveModal = function(id) {
  const p = _allRecepcionsData.find(x => x.id == id);
  if (!p) return;

  const hasConformidad = !!p.conformidad_url;
  const hasComprobante = !!p.comprobante_url;

  const body = `
    <div class="space-y-4">
      <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <div class="flex items-center gap-2">
            <i data-lucide="info" class="w-4 h-4"></i>
            <strong>Orden: ${p.numero_oc}</strong>
        </div>
        <p class="text-[11px] mt-1 opacity-80">Proveedor: ${p.proveedor_nombre} | Condición: ${p.condicion_pago}</p>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <!-- Conformidad -->
        <div class="p-4 rounded-xl border-2 ${hasConformidad ? 'bg-green-50/50 border-green-200' : 'border-dashed border-muted hover:border-primary/40'}">
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-bold flex items-center gap-2">
                    <i data-lucide="check-circle" class="w-4 h-4 ${hasConformidad ? 'text-green-600' : 'text-muted-foreground'}"></i>
                    1. Conformidad de Servicio / Recepción
                </h4>
                ${hasConformidad ? '<span class="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">CARGADO</span>' : ''}
            </div>
            
            ${hasConformidad ? `
                <a href="${p.conformidad_url}" target="_blank" class="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                    <i data-lucide="external-link" class="w-3 h-3"></i> Ver documento cargado
                </a>
            ` : `
                <p class="text-[11px] text-muted-foreground mb-3">Suba el documento que avala la entrega o término del servicio.</p>
                <div class="flex items-center gap-2">
                    <input type="file" id="file-conformidad" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('name-conf').textContent = this.files[0]?.name">
                    <button class="btn btn-outline btn-sm text-xs" onclick="document.getElementById('file-conformidad').click()">
                        <i data-lucide="upload" class="w-3 h-3"></i> Seleccionar Archivo
                    </button>
                    <span id="name-conf" class="text-[10px] text-muted-foreground truncate max-w-[150px]"></span>
                </div>
            `}
        </div>

        <!-- Factura -->
        <div class="p-4 rounded-xl border-2 ${hasComprobante ? 'bg-green-50/50 border-green-200' : 'border-dashed border-muted hover:border-primary/40'}">
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-bold flex items-center gap-2">
                    <i data-lucide="file-text" class="w-4 h-4 ${hasComprobante ? 'text-green-600' : 'text-muted-foreground'}"></i>
                    2. Factura / Boleta / RxH
                </h4>
                ${hasComprobante ? '<span class="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">CARGADO</span>' : ''}
            </div>
            
            ${hasComprobante ? `
                <a href="${p.comprobante_url}" target="_blank" class="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                    <i data-lucide="external-link" class="w-3 h-3"></i> Ver documento cargado
                </a>
            ` : `
                <p class="text-[11px] text-muted-foreground mb-3">Suba el comprobante oficial de pago (SUNAT).</p>
                <div class="flex items-center gap-2">
                    <input type="file" id="file-comprobante" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('name-comp').textContent = this.files[0]?.name">
                    <button class="btn btn-outline btn-sm text-xs" onclick="document.getElementById('file-comprobante').click()">
                        <i data-lucide="upload" class="w-3 h-3"></i> Seleccionar Archivo
                    </button>
                    <span id="name-comp" class="text-[10px] text-muted-foreground truncate max-w-[150px]"></span>
                </div>
            `}
        </div>
      </div>
    </div>`;

  UI.modal({
    title: 'Procesar Recepción: ' + p.numero_oc,
    body,
    confirmText: 'Guardar Documentos',
    onConfirm: async () => {
      const fConf = document.getElementById('file-conformidad');
      const fComp = document.getElementById('file-comprobante');
      
      if ((!fConf || !fConf.files[0]) && (!fComp || !fComp.files[0])) {
          UI.toast('Debe subir al menos un documento nuevo', 'info');
          return;
      }

      UI.toast('Subiendo a Google Drive...', 'info');

      try {
        const token = await new Promise((resolve) => {
            google.accounts.oauth2.initTokenClient({
                client_id: '180581650294-1hq62hvc88ucednj1a4ksbccaj6vfhdg.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: resolve
            }).requestAccessToken();
        });

        const upload = async (file, type) => {
            const metadata = { 
                name: `${type}_${p.numero_oc}_${new Date().getTime()}.${file.name.split('.').pop()}`, 
                parents: ['1SM2SDdbypPMkNN-VAAyA5q9WSkszWjSs'] 
            };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);
            const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=webViewLink', {
                method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token }, body: form
            }).then(r => r.json());
            return resp.webViewLink;
        };

        const payload = { action: 'receive', id: p.id };
        if (fConf && fConf.files[0]) payload.conformidad_url = await upload(fConf.files[0], 'Conformidad');
        if (fComp && fComp.files[0]) payload.comprobante_url = await upload(fComp.files[0], 'Factura');

        const resp = await fetch('api/purchases.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (resp.ok) {
          UI.toast('Documento(s) guardado(s) correctamente', 'success');
          document.getElementById('modal-overlay')?.remove();
          loadRecepcions();
        } else {
          UI.toast('Error: ' + resp.error, 'error');
        }
      } catch (err) {
        console.error(err);
        UI.toast('Error al procesar: ' + err.message, 'error');
      }
    }
  });
  lucide.createIcons();
};

window.deletePurchase = function(id, oc) {
  UI.modal({ title: 'Eliminar orden', body: `<p>¿Eliminar la orden <strong>${oc}</strong>?</p>`, confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/purchases.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { 
        UI.toast('Orden eliminada', 'success'); 
        document.getElementById('modal-overlay')?.remove();
        loadPurchases(); 
      }
    }
  });
};

window.Views.purchases = function() {
  return `
    ${UI.pageHeader('Órdenes de Compra / Servicio','Solicitudes y compras realizadas', `
      <button class="btn btn-primary" onclick="Router.go('new-purchase')"><i data-lucide="plus"></i>Nueva orden</button>
    `)}
    
    <!-- Filtros -->
    <div class="card p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/20">
      <div>
        <label class="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Código (OC/OS)</label>
        <input id="filter-oc-code" class="input w-full h-9" placeholder="Buscar por código..." oninput="filterPurchases()">
      </div>
      <div>
        <label class="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Proveedor</label>
        <input id="filter-oc-supplier" class="input w-full h-9" placeholder="Nombre del proveedor..." oninput="filterPurchases()">
      </div>
      <div>
        <label class="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Fecha</label>
        <input id="filter-oc-date" type="date" class="input w-full h-9" onchange="filterPurchases()">
      </div>
      <div>
        <label class="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Estado</label>
        <select id="filter-oc-status" class="select w-full h-9" onchange="filterPurchases()">
          <option value="">Todos los estados</option>
          ${OC_ESTADOS.map(e => `<option value="${e}">${e}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>N° Doc</th><th>Proveedor</th><th>Fecha</th><th>Monto</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="purchases-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.purchases.afterMount = loadPurchases;

// ---- PERSONAL ----
function staffFormHTML(s, areas) {
  return `
    <div class="grid grid-cols-1 gap-4">
      <div><label class="text-sm font-medium">DNI</label>
        <input id="stf-dni" class="input mt-1 w-full" placeholder="12345678" maxlength="15" value="${s ? (s.dni || '') : ''}"></div>
      <div><label class="text-sm font-medium">Nombre completo <span class="text-destructive">*</span></label>
        <input id="stf-nombre" class="input mt-1 w-full" placeholder="Juan Pérez García" value="${s ? s.nombre : ''}"></div>
      <div><label class="text-sm font-medium">Cargo</label>
        <input id="stf-cargo" class="input mt-1 w-full" placeholder="Docente" value="${s ? (s.cargo || '') : ''}"></div>
      <div><label class="text-sm font-medium">Área / Departamento</label>
        <select id="stf-area" class="select mt-1 w-full">
          <option value="">Sin área</option>
          ${areas.map(a => `<option value="${a.id}" ${s && s.area_id == a.id ? 'selected' : ''}>${a.nombre}</option>`).join('')}
        </select></div>
      <div><label class="text-sm font-medium">Teléfono</label>
        <input id="stf-tel" class="input mt-1 w-full" placeholder="987654321" value="${s ? (s.telefono || '') : ''}"></div>
    </div>`;
}

async function loadStaff() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/staff.php').then(r => r.json());
    if (!data.staff || data.staff.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay personal registrado.</td></tr>';
      return;
    }
    tbody.innerHTML = data.staff.map(s => `
      <tr>
        <td class="font-mono text-xs">${s.dni || '—'}</td>
        <td class="font-medium">${s.nombre}</td>
        <td>${s.cargo || '—'}</td>
        <td>${s.area_nombre || '<span class="text-muted-foreground">—</span>'}</td>
        <td>${s.telefono || '—'}</td>
        <td class="text-right">
          <button class="btn btn-ghost p-1.5" onclick="editStaff(${s.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteStaff(${s.id}, '${s.nombre.replace(/'/g,"\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar.</td></tr>'; }
}

async function openStaffModal(sData) {
  const areaData = await fetch('api/areas.php').then(r => r.json()).catch(() => ({ areas: [] }));
  UI.modal({
    title: sData ? 'Editar personal' : 'Nuevo personal',
    body: staffFormHTML(sData, areaData.areas),
    confirmText: sData ? 'Guardar cambios' : 'Registrar',
    onConfirm: async () => {
      const nombre = document.getElementById('stf-nombre').value.trim();
      if (!nombre) { UI.toast('El nombre es obligatorio', 'error'); return; }
      const body = { 
        dni: document.getElementById('stf-dni').value.trim(), 
        nombre, 
        cargo: document.getElementById('stf-cargo').value.trim(), 
        area_id: document.getElementById('stf-area').value || null, 
        telefono: document.getElementById('stf-tel').value.trim() 
      };
      if (sData) body.id = sData.id;
      const resp = await fetch('api/staff.php', { method: sData ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const res = await resp.json();
      if (res.ok) { UI.toast(sData ? 'Personal actualizado' : 'Personal registrado', 'success'); loadStaff(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
}

window.newStaff = () => openStaffModal(null);
window.editStaff = async function(id) {
  const data = await fetch('api/staff.php').then(r => r.json());
  const s = data.staff.find(x => x.id == id);
  if (s) openStaffModal(s);
};
window.deleteStaff = function(id, nombre) {
  UI.modal({ title: 'Eliminar personal', body: `<p>¿Eliminar a <strong>${nombre}</strong>?</p>`, confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      const res = await fetch(`api/staff.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Personal eliminado', 'success'); loadStaff(); }
    }
  });
};

window.Views.staff = function() {
  return `
    ${UI.pageHeader('Personal','Personal del colegio y sus cargos', `
      <button class="btn btn-primary" onclick="newStaff()"><i data-lucide="plus"></i>Nuevo personal</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>DNI</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Teléfono</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="staff-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
      </table>
    </div>`;
};
window.Views.staff.afterMount = loadStaff;

// ---- RECEPCIONES ----
async function loadRecepcions() {
  const tbodyPend = document.getElementById('recepcions-table-body');
  const tbodyHist = document.getElementById('recepcions-hist-body');
  if (!tbodyPend) return;
  
  try {
    const data = await fetch('api/purchases.php').then(r => r.json());
    _allRecepcionsData = data.purchases || [];
    const purchases = _allRecepcionsData;
    
    // 1. Pendientes: Aprobadas/Recibidas que les falte algún documento
    const pend = purchases.filter(p => {
        if (p.estado !== 'Aprobada' && p.estado !== 'Recibida') return false;
        
        // Si ya tiene ambos, no es pendiente (debería estar en historial)
        const faltaDoc = !p.conformidad_url || !p.comprobante_url;
        if (!faltaDoc) return false;

        if (p.condicion_pago === 'Adelanto + Saldo') {
            return p.adelanto_pagado == 1; // Tras adelanto
        }
        if (p.condicion_pago === 'Credito' && p.total_cuotas_reg > 0) {
            return p.pagado == 1; // Tras pago total
        }
        return p.pagado == 1; // Al contado, etc
    });

    if (pend.length === 0) {
      tbodyPend.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-muted-foreground text-sm">No hay recepciones pendientes.</td></tr>';
    } else {
      tbodyPend.innerHTML = pend.map(p => {
        const isAdelanto = p.condicion_pago === 'Adelanto + Saldo';
        const labelPago = isAdelanto ? 'Adelanto Pagado' : 'Pagado';
        const fechaRef = isAdelanto ? p.adelanto_fecha : p.fecha_pago;
        
        let nextStep = '';
        if (!p.conformidad_url && !p.comprobante_url) nextStep = 'Conformidad y Factura';
        else if (!p.conformidad_url) nextStep = 'Subir Conformidad';
        else if (!p.comprobante_url) nextStep = 'Subir Factura / RxH';

        return `
        <tr>
          <td class="font-mono text-xs font-bold">${p.numero_oc}</td>
          <td class="font-medium">
            <div>${p.proveedor_nombre}</div>
            <div class="text-[10px] text-muted-foreground font-normal">${p.condicion_pago}</div>
          </td>
          <td class="text-xs text-muted-foreground">${p.area_nombre || '—'}</td>
          <td class="text-xs">
              <div class="font-semibold text-green-600">${labelPago}</div>
              <div class="text-[10px] text-muted-foreground">${fechaRef ? new Date(fechaRef).toLocaleDateString() : '—'}</div>
          </td>
          <td class="text-xs">
              <span class="badge ${nextStep.includes('Factura') && !nextStep.includes('Conformidad') ? 'badge-orange' : 'badge-blue'} text-[10px]">${nextStep}</span>
          </td>
          <td class="text-right">
            <button class="btn btn-primary btn-sm px-2 py-1 text-xs" onclick="openReceiveModal(${p.id})">
              <i data-lucide="package-check" class="w-3.5 h-3.5"></i> Procesar
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    // 2. Historial: Recibidas (con AMBOS documentos)
    const hist = purchases.filter(p => p.conformidad_url && p.comprobante_url);
    if (tbodyHist) {
      if (hist.length === 0) {
        tbodyHist.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-muted-foreground text-sm">El historial está vacío.</td></tr>';
      } else {
        tbodyHist.innerHTML = hist.map(p => `
          <tr>
            <td class="font-mono text-xs font-bold">${p.numero_oc}</td>
            <td class="font-medium">${p.proveedor_nombre}</td>
            <td class="text-xs">
              <div class="font-semibold text-blue-600">Completada</div>
              <div class="text-[10px] text-muted-foreground">${new Date(p.fecha_recepcion || p.fecha_conformidad).toLocaleDateString()}</div>
            </td>
            <td>
              <div class="flex flex-col gap-1">
                ${p.conformidad_url ? `
                    <a href="${p.conformidad_url}" target="_blank" class="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <i data-lucide="file-check" class="w-3 h-3"></i> Conformidad
                    </a>` : ''}
                ${p.comprobante_url ? `
                    <a href="${p.comprobante_url}" target="_blank" class="text-[10px] text-orange-600 hover:underline flex items-center gap-1">
                        <i data-lucide="file-text" class="w-3 h-3"></i> Factura / RxH
                    </a>` : ''}
              </div>
            </td>
            <td class="text-right">
               <button class="btn btn-ghost p-1.5" onclick="editPurchase(${p.id})"><i data-lucide="eye" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('');
      }
    }

    lucide.createIcons();
  } catch { 
    if (tbodyPend) tbodyPend.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>'; 
  }
}

window.Views.recepcions = function() {
  return `
    ${UI.pageHeader('Gestión de Recepciones','Control de entrada de insumos, activos y servicios finalizados', '')}
    
    <div class="grid grid-cols-1 gap-6">
      <!-- Tabla de Pendientes -->
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 class="font-bold text-sm flex items-center gap-2 text-primary">
            <i data-lucide="clock" class="w-4 h-4"></i> Recepciones Pendientes
          </h3>
          <span class="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Requiere Acción</span>
        </div>
        <table class="data">
          <thead><tr><th>N° Doc</th><th>Proveedor</th><th>Área</th><th>Estado Pago</th><th>Próximo Paso</th><th class="text-right">Acciones</th></tr></thead>
          <tbody id="recepcions-table-body"><tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
        </table>
      </div>

      <!-- Historial -->
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
          <h3 class="font-bold text-sm flex items-center gap-2 text-muted-foreground">
            <i data-lucide="history" class="w-4 h-4"></i> Historial de Recepciones
          </h3>
        </div>
        <table class="data">
          <thead><tr><th>N° Doc</th><th>Proveedor</th><th>Fecha Rec.</th><th>Comprobante</th><th class="text-right">Detalle</th></tr></thead>
          <tbody id="recepcions-hist-body"><tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr></tbody>
        </table>
      </div>
    </div>`;
};
window.Views.recepcions.afterMount = loadRecepcions;

