// ===================================================
// AULAS Y ESPACIOS — Módulo de Gestión de Ubicaciones
// Con soporte de Pabellón, Piso, Código Automático y QR
// ===================================================

const PABELLONES = ['A', 'B', 'C'];
const PISOS = [
  { value: 1, label: '1er Piso' },
  { value: 2, label: '2do Piso' },
  { value: 3, label: '3er Piso' },
  { value: 4, label: '4to Piso' },
];

let _locationsData = [];
let _filteredLocations = [];

async function loadLocations() {
  const tbody = document.getElementById('locations-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/locations.php').then(r => r.json());
    _locationsData = data.locations || [];
    _filteredLocations = [..._locationsData];
    
    renderLocationsFilterControls();
    applyLocationsFilters();
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-10 text-destructive">Error al cargar.</td></tr>';
  }
}

function renderLocationsFilterControls() {
  const container = document.getElementById('locations-filters');
  if (!container) return;

  const uniqueTipos = Array.from(new Set(_locationsData.map(l => l.tipo))).filter(Boolean);

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <!-- Buscar / Escanear -->
      <div>
        <label class="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">Buscar / Escanear</label>
        <div class="relative group">
          <input id="f-loc-search" type="text" placeholder="Código, nombre o encargado..." class="input w-full pr-12 font-medium" oninput="applyLocationsFilters()">
          <button class="absolute right-1 top-1 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="openLocationsScanner()" title="Escanear Código QR">
            <i data-lucide="maximize" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
      
      <!-- Pabellón -->
      <div>
        <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Pabellón</label>
        <select id="f-loc-pabellon" class="select w-full font-medium" onchange="applyLocationsFilters()">
          <option value="">Todos</option>
          ${PABELLONES.map(p => `<option value="${p}">Pabellón ${p}</option>`).join('')}
        </select>
      </div>

      <!-- Piso -->
      <div>
        <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Piso</label>
        <select id="f-loc-piso" class="select w-full font-medium" onchange="applyLocationsFilters()">
          <option value="">Todos</option>
          ${PISOS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
        </select>
      </div>

      <!-- Tipo de Espacio -->
      <div>
        <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Tipo de Espacio</label>
        <select id="f-loc-tipo" class="select w-full font-medium" onchange="applyLocationsFilters()">
          <option value="">Todos los tipos</option>
          ${uniqueTipos.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>

      <!-- Estado -->
      <div>
        <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Estado</label>
        <select id="f-loc-estado" class="select w-full font-medium" onchange="applyLocationsFilters()">
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">De Baja / Inactivos</option>
        </select>
      </div>

      <!-- Botón Limpiar -->
      <div class="flex items-end">
        <button class="btn btn-outline w-full hover:bg-slate-50 flex items-center justify-center gap-2 py-2.5 font-bold text-slate-700" onclick="clearLocationsFilters()" title="Limpiar todos los filtros">
          <i data-lucide="eraser" class="w-4 h-4"></i> Limpiar Filtros
        </button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

window.applyLocationsFilters = function() {
  const search   = document.getElementById('f-loc-search')?.value.toLowerCase() || '';
  const pabellon = document.getElementById('f-loc-pabellon')?.value || '';
  const piso     = document.getElementById('f-loc-piso')?.value || '';
  const tipo     = document.getElementById('f-loc-tipo')?.value || '';
  const estado   = document.getElementById('f-loc-estado')?.value || '';

  _filteredLocations = _locationsData.filter(l => {
    const matchSearch = !search || 
      (l.nombre || '').toLowerCase().includes(search) || 
      (l.codigo || '').toLowerCase().includes(search) || 
      (l.responsable_nombre || '').toLowerCase().includes(search);
    const matchPab    = !pabellon || l.pabellon === pabellon;
    const matchPiso   = !piso || l.piso == piso;
    const matchTipo   = !tipo || l.tipo === tipo;
    const matchEstado = !estado || l.estado === estado;

    return matchSearch && matchPab && matchPiso && matchTipo && matchEstado;
  });

  renderLocationsRows(_filteredLocations);
};

window.openLocationsScanner = function() {
  UI.openScanner((decodedText) => {
    const searchInput = document.getElementById('f-loc-search');
    if (searchInput) {
      searchInput.value = decodedText;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    applyLocationsFilters();
    return true;
  });
};

window.clearLocationsFilters = function() {
  const search   = document.getElementById('f-loc-search');
  const pabellon = document.getElementById('f-loc-pabellon');
  const piso     = document.getElementById('f-loc-piso');
  const tipo     = document.getElementById('f-loc-tipo');
  const estado   = document.getElementById('f-loc-estado');

  if (search)   search.value = '';
  if (pabellon) pabellon.value = '';
  if (piso)     piso.value = '';
  if (tipo)     tipo.value = '';
  if (estado)   estado.value = '';

  applyLocationsFilters();
};

function renderLocationsRows(data) {
  const tbody = document.getElementById('locations-table-body');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-10 text-muted-foreground italic font-medium">No se encontraron espacios que coincidan con los filtros.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(l => {
    const inactive = l.estado === 'inactivo';
    const dimClass = inactive ? 'opacity-50 grayscale' : '';
    const pisoLabel = l.piso ? (PISOS.find(p => p.value == l.piso)?.label || `Piso ${l.piso}`) : '—';

    return `
      <tr class="${inactive ? 'bg-muted/30' : ''} hover:bg-primary/5 transition-all">
        <td class="font-mono text-xs font-bold text-primary ${dimClass}">${l.codigo || '—'}</td>
        <td class="${dimClass}">
          <div class="font-bold text-slate-800 text-sm">${l.nombre}</div>
        </td>
        <td class="text-xs uppercase font-semibold ${dimClass}">${l.tipo || '—'}</td>
        <td class="text-center ${dimClass}">
          ${l.pabellon
            ? `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-black text-sm">${l.pabellon}</span>`
            : '<span class="text-muted-foreground text-xs">—</span>'}
        </td>
        <td class="text-xs font-semibold text-center ${dimClass}">${pisoLabel}</td>
        <td class="text-xs text-muted-foreground uppercase font-bold ${dimClass}">${l.sede_nombre || '—'}</td>
        <td class="${dimClass}">${l.responsable_nombre || '<span class="text-muted-foreground text-xs italic">Sin responsable</span>'}</td>
        <td class="text-right whitespace-nowrap">
          <div class="flex justify-end gap-1">
            ${l.codigo ? `
            <button class="btn btn-ghost p-1.5 text-primary ${dimClass}" title="Ver Código QR / Imprimir Etiqueta"
                    onclick="showLocationQR('${l.codigo}', '${l.nombre.replace(/'/g, "\\'")}', '${l.tipo || ''}')">
              <i data-lucide="qr-code" class="w-4 h-4"></i>
            </button>` : ''}
            <button class="btn btn-ghost p-1.5 ${inactive ? 'text-green-500' : 'text-destructive'}"
                    title="${inactive ? 'Activar' : 'Dar de baja'}"
                    onclick="toggleLocationStatus(${l.id}, '${l.estado}', '${l.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="${inactive ? 'user-check' : 'user-x'}" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 ${dimClass}" title="Ver Inventario Actual"
                    onclick="viewLocationInventory(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 ${dimClass}" title="Ver Historial de Responsables"
                    onclick="viewLocationHistory(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="history" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 ${dimClass}" title="Editar"
                    onclick="editLocation(${l.id})">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 text-destructive ${dimClass}" title="Eliminar"
                    onclick="deleteLocation(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
  lucide.createIcons();
}

window.exportLocations = function() {
  const dataToExport = _filteredLocations.map(l => ({
    'Código': l.codigo || '—',
    'Nombre / Nro': l.nombre,
    'Tipo': l.tipo || '—',
    'Pabellón': l.pabellon || '—',
    'Piso': l.piso ? (PISOS.find(p => p.value == l.piso)?.label || `Piso ${l.piso}`) : '—',
    'Sede': l.sede_nombre || '—',
    'Responsable / Encargado': l.responsable_nombre || 'Sin asignar',
    'Estado': l.estado === 'activo' ? 'Activo' : 'De Baja / Inactivo'
  }));
  
  const fecha = todayPE();
  UI.exportToExcel(dataToExport, `Aulas_y_Espacios_${fecha}.xlsx`);
};

// ─── FORMULARIO ──────────────────────────────────────────────────────────────

function locationFormHTML(l, sedes, staff) {
  const pabellonOptions = PABELLONES.map(p =>
    `<option value="${p}" ${l && l.pabellon === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  const pisoOptions = PISOS.map(p =>
    `<option value="${p.value}" ${l && l.piso == p.value ? 'selected' : ''}>${p.label}</option>`
  ).join('');

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Sede -->
      <div>
        <label class="text-sm font-medium">Sede <span class="text-destructive">*</span></label>
        <select id="loc-sede" class="select mt-1 w-full" onchange="generateLocCode()">
          <option value="">Seleccione sede...</option>
          ${sedes.map(s => `<option value="${s.id}" ${l && l.sede_id == s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}
        </select>
      </div>

      <!-- Tipo de Espacio -->
      <div>
        <label class="text-sm font-medium">Tipo de Espacio <span class="text-destructive">*</span></label>
        <select id="loc-tipo" class="select mt-1 w-full" onchange="toggleSufijo(); generateLocCode()">
          ${['Aula','Laboratorio','Depósito','Oficina','Taller','Cancha','Servicios Higiénicos','Otro'].map(t =>
            `<option value="${t}" ${l && l.tipo === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
        
        <div id="div-sufijo" class="${l && l.tipo === 'Servicios Higiénicos' ? 'mt-3' : 'hidden mt-3'}">
          <label class="text-sm font-medium text-indigo-600">Sufijo para Baños</label>
          <select id="loc-sufijo" class="select mt-1 w-full" onchange="generateLocCode()">
            <option value="">Sin sufijo</option>
            <option value="A" ${l && l.codigo && l.codigo.endsWith('-A') ? 'selected' : ''}>A (ej: Damas)</option>
            <option value="B" ${l && l.codigo && l.codigo.endsWith('-B') ? 'selected' : ''}>B (ej: Varones)</option>
          </select>
        </div>
      </div>

      <!-- Pabellón -->
      <div>
        <label class="text-sm font-medium">Pabellón <span class="text-destructive">*</span></label>
        <select id="loc-pabellon" class="select mt-1 w-full" onchange="generateLocCode()">
          <option value="">Seleccione pabellón...</option>
          ${pabellonOptions}
        </select>
      </div>

      <!-- Piso -->
      <div>
        <label class="text-sm font-medium">Piso <span class="text-destructive">*</span></label>
        <select id="loc-piso" class="select mt-1 w-full" onchange="generateLocCode()">
          <option value="">Seleccione piso...</option>
          ${pisoOptions}
        </select>
      </div>

      <!-- Código Interno (auto-generado) -->
      <div class="md:col-span-2">
        <label class="text-sm font-medium">
          Código Interno
          <span class="ml-2 text-[10px] text-muted-foreground font-normal italic">
            (se genera automáticamente al seleccionar Sede, Pabellón y Piso)
          </span>
        </label>
        <div class="flex gap-2 mt-1 items-center">
          <input id="loc-codigo" class="input w-full bg-muted cursor-not-allowed font-mono text-sm font-bold tracking-widest text-primary" readonly placeholder="Ej: CC-ESP-A101" value="${l ? (l.codigo || '') : ''}">
          <button type="button" class="btn btn-outline shrink-0" onclick="generateLocCode()" title="Regenerar código">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Nombre -->
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Nombre / Número <span class="text-destructive">*</span></label>
        <input id="loc-nombre" class="input mt-1 w-full" placeholder="Ej: Aula de Cómputo" value="${l ? l.nombre : ''}">
      </div>

      <!-- Responsable -->
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Responsable / Encargado</label>
        <select id="loc-responsable" class="select mt-1 w-full">
          <option value="">Sin asignar</option>
          ${staff.map(s => `<option value="${s.id}" ${l && l.responsable_id == s.id ? 'selected' : ''}>${s.nombre} (${s.cargo || 'Personal'})</option>`).join('')}
        </select>
      </div>

      <!-- Estado -->
      <div class="md:col-span-2">
        <label class="text-sm font-medium">Estado</label>
        <select id="loc-estado" class="select mt-1 w-full">
          <option value="activo"   ${l && l.estado === 'activo'   ? 'selected' : ''}>Activo</option>
          <option value="inactivo" ${l && l.estado === 'inactivo' ? 'selected' : ''}>Inactivo (De Baja)</option>
        </select>
      </div>
    </div>

    <!-- Preview del código -->
    <div id="loc-code-preview" class="mt-4 hidden">
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <i data-lucide="building-2" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Código asignado</div>
          <div id="loc-code-display" class="text-xl font-black font-mono text-primary tracking-wider"></div>
        </div>
      </div>
    </div>`;
}

window.toggleSufijo = function() {
  const tipo = document.getElementById('loc-tipo')?.value;
  const divSufijo = document.getElementById('div-sufijo');
  const sufijo = document.getElementById('loc-sufijo');
  if (tipo === 'Servicios Higiénicos') {
    divSufijo.classList.remove('hidden');
  } else {
    divSufijo.classList.add('hidden');
    if (sufijo) sufijo.value = '';
  }
};

// ─── GENERACIÓN AUTOMÁTICA DE CÓDIGO ─────────────────────────────────────────

window.generateLocCode = async function() {
  const sedeEl    = document.getElementById('loc-sede');
  const pabEl     = document.getElementById('loc-pabellon');
  const pisoEl    = document.getElementById('loc-piso');
  const codigoEl  = document.getElementById('loc-codigo');
  const previewEl = document.getElementById('loc-code-preview');
  const displayEl = document.getElementById('loc-code-display');

  const sede_id  = sedeEl?.value;
  const pabellon = pabEl?.value;
  const piso     = pisoEl?.value;

  if (!sede_id || !pabellon || !piso) return;

  try {
    const tipo = document.getElementById('loc-tipo')?.value || '';
    const sufijo = document.getElementById('loc-sufijo')?.value || '';
    const url = `api/locations.php?action=next_code&sede_id=${sede_id}&pabellon=${encodeURIComponent(pabellon)}&piso=${piso}&tipo=${encodeURIComponent(tipo)}&sufijo=${encodeURIComponent(sufijo)}`;
    const resp = await fetch(url).then(r => r.json());
    if (resp.next_code) {
      let finalCode = resp.next_code;
      const tipo = document.getElementById('loc-tipo')?.value;
      const sufijo = document.getElementById('loc-sufijo')?.value;
      
      if (tipo === 'Servicios Higiénicos' && sufijo) {
        finalCode += '-' + sufijo;
      }
      
      codigoEl.value = finalCode;
      if (previewEl) previewEl.classList.remove('hidden');
      if (displayEl) displayEl.textContent = finalCode;
      lucide.createIcons();
    }
  } catch(e) {}
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

window.newLocation = async function() {
  const [sedesR, staffR] = await Promise.all([
    fetch('api/sedes.php').then(r => r.json()).catch(() => ({ sedes: [] })),
    fetch('api/staff.php').then(r => r.json()).catch(() => ({ staff: [] }))
  ]);

  UI.modal({
    title: 'Registrar Nuevo Espacio',
    body: locationFormHTML(null, sedesR.sedes || [], staffR.staff || []),
    confirmText: 'Guardar',
    onConfirm: async () => {
      const nombre    = document.getElementById('loc-nombre').value.trim();
      const sede_id   = document.getElementById('loc-sede').value;
      const pabellon  = document.getElementById('loc-pabellon').value;
      const piso      = document.getElementById('loc-piso').value;

      if (!nombre)   { UI.toast('El nombre es obligatorio', 'error'); return false; }
      if (!sede_id)  { UI.toast('La sede es obligatoria', 'error'); return false; }
      if (!pabellon) { UI.toast('El pabellón es obligatorio', 'error'); return false; }
      if (!piso)     { UI.toast('El piso es obligatorio', 'error'); return false; }

      const body = {
        codigo:         document.getElementById('loc-codigo').value.trim(),
        nombre,
        tipo:           document.getElementById('loc-tipo').value,
        pabellon,
        piso:           parseInt(piso),
        sede_id,
        responsable_id: document.getElementById('loc-responsable').value || null,
        estado:         document.getElementById('loc-estado').value
      };

      const res = await fetch('api/locations.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());

      if (res.ok) { UI.toast('Espacio registrado con éxito ✓', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
  lucide.createIcons();
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
    body: locationFormHTML(l, sedesR.sedes || [], staffR.staff || []),
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const nombre    = document.getElementById('loc-nombre').value.trim();
      const sede_id   = document.getElementById('loc-sede').value;
      const pabellon  = document.getElementById('loc-pabellon').value;
      const piso      = document.getElementById('loc-piso').value;

      if (!nombre)   { UI.toast('El nombre es obligatorio', 'error'); return false; }
      if (!sede_id)  { UI.toast('La sede es obligatoria', 'error'); return false; }

      const body = {
        id,
        codigo:         document.getElementById('loc-codigo').value.trim(),
        nombre,
        tipo:           document.getElementById('loc-tipo').value,
        pabellon:       pabellon || null,
        piso:           piso ? parseInt(piso) : null,
        sede_id,
        responsable_id: document.getElementById('loc-responsable').value || null,
        estado:         document.getElementById('loc-estado').value
      };

      const res = await fetch('api/locations.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());

      if (res.ok) { UI.toast('Ubicación actualizada ✓', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
  lucide.createIcons();
};

window.deleteLocation = function(id, nombre) {
  UI.modal({
    title: 'Eliminar Espacio',
    body: `<p>¿Estás seguro de eliminar <strong>${nombre}</strong>? Se perderán las vinculaciones de activos en esta ubicación.</p>`,
    confirmText: 'Sí, eliminar',
    confirmClass: 'btn-destructive',
    onConfirm: async () => {
      const res = await fetch(`api/locations.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) { UI.toast('Ubicación eliminada', 'success'); loadLocations(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.toggleLocationStatus = async function(id, currentStatus, name) {
  const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
  const action    = newStatus === 'activo' ? 'activar' : 'dar de baja';

  UI.modal({
    title: `${newStatus === 'activo' ? 'Activar' : 'Dar de baja'} Ubicación`,
    body: `<p>¿Está seguro de que desea <strong>${action}</strong> la ubicación <strong>${name}</strong>?</p>
           <p class="text-xs text-muted-foreground mt-2 italic">Nota: Al dar de baja, el espacio ya no aparecerá como opción para nuevos traslados, pero se mantendrá su historial.</p>`,
    confirmText: `Sí, ${action}`,
    onConfirm: async () => {
      UI.loading('Actualizando estado...');
      try {
        const data = await fetch('api/locations.php').then(r => r.json());
        const l = data.locations.find(x => x.id == id);
        if (!l) throw new Error('Ubicación no encontrada');

        const body = { ...l, estado: newStatus };
        const res = await fetch('api/locations.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).then(r => r.json());

        UI.stopLoading();
        if (res.ok) {
          UI.toast(`Ubicación ${newStatus === 'activo' ? 'activada' : 'dada de baja'}`, 'success');
          loadLocations();
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

// ─── QR CODE ─────────────────────────────────────────────────────────────────

window.showLocationQR = function(codigo, nombre, tipo) {
  const containerId = `qr-loc-${Math.random().toString(36).substr(2, 9)}`;
  const categoria   = tipo ? `${tipo} · ${nombre}` : nombre;
  const shortCode   = codigo.includes('-ESP-') ? codigo.split('-ESP-')[1] : codigo;

  UI.modal({
    title: 'Etiqueta del Espacio',
    size: 'lg',
    body: `
      <div class="flex flex-col md:flex-row items-center gap-10 p-4">
        <!-- Info -->
        <div class="flex-1 space-y-6 text-center md:text-left">
          <div>
            <div class="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-1">Tipo de Espacio</div>
            <div class="text-xl font-black text-foreground">${tipo || 'Espacio'}</div>
          </div>
          <div>
            <div class="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-1">Nombre</div>
            <div class="text-lg font-bold text-foreground">${nombre}</div>
          </div>
          <div>
            <div class="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-1">Código de Espacio</div>
            <div class="text-3xl font-black font-mono text-primary tracking-widest">${shortCode}</div>
          </div>
          <div class="pt-4 flex flex-col gap-3">
            <button class="btn btn-primary shadow-lg" onclick="UI.downloadQR('${containerId}', '${codigo}', '${categoria.replace(/'/g,"\\'")}', '${shortCode}')">
              <i data-lucide="download" class="w-4 h-4 mr-2"></i> Descargar Imagen
            </button>
            <button class="btn btn-outline" onclick="UI.printQR('${containerId}', '${codigo}', '${categoria.replace(/'/g,"\\'")}', '${shortCode}')">
              <i data-lucide="printer" class="w-4 h-4 mr-2"></i> Imprimir Etiqueta
            </button>
          </div>
        </div>
        <!-- QR -->
        <div class="shrink-0">
          <div class="p-8 bg-white border-8 border-slate-50 rounded-[2.5rem] shadow-2xl">
            <div id="${containerId}"></div>
          </div>
          <p class="text-center text-[10px] text-muted-foreground mt-3 font-mono">${shortCode}</p>
        </div>
      </div>`,
    confirmText: 'Cerrar',
    hideCancel: true
  });

  setTimeout(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    new QRCode(el, {
      text: codigo,
      width: 200,
      height: 200,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
    lucide.createIcons();
  }, 150);
};

// ─── VISTA PRINCIPAL ──────────────────────────────────────────────────────────

window.Views.locations = function() {
  return `
    ${UI.pageHeader('Aulas y Espacios', 'Gestión de infraestructura, pabellones y pisos', `
      <button class="btn btn-outline shadow-sm text-emerald-600" onclick="exportLocations()">
        <i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i> Exportar Excel
      </button>
      <button class="btn btn-primary shadow-lg" onclick="newLocation()">
        <i data-lucide="plus" class="w-4 h-4 mr-2"></i> Nuevo Espacio
      </button>
    `)}

    <!-- Leyenda de pabellones -->
    <div class="flex flex-wrap gap-2 mb-4">
      ${PABELLONES.map(p => `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold text-primary">
          <span class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center font-black">${p}</span>
          Pabellón ${p}
        </div>`).join('')}
      ${PISOS.map(p => `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
          <i data-lucide="layers" class="w-3 h-3"></i> ${p.label}
        </div>`).join('')}
    </div>

    <!-- PANEL DE FILTROS -->
    <div class="card p-6 mb-8 bg-white shadow-xl shadow-slate-200/50 border-primary/5">
        <div id="locations-filters">
            <div class="h-12 flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic animate-pulse">Preparando filtros inteligentes...</div>
        </div>
    </div>

    <div class="card shadow-2xl shadow-slate-200/40">
      <div class="table-container">
        <table class="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre / Nro</th>
              <th>Tipo</th>
              <th class="text-center">Pabellón</th>
              <th class="text-center">Piso</th>
              <th>Sede</th>
              <th>Responsable</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="locations-table-body">
            <tr><td colspan="8" class="text-center py-10 text-muted-foreground">Cargando espacios...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
};

// ─── HISTORIAL E INVENTARIO (sin cambios) ─────────────────────────────────────

window.viewLocationHistory = async function(id, nombre) {
  UI.loading('Cargando historial completo...');
  try {
    const data = await fetch(`api/unified_history.php?type=location&id=${id}`).then(r => r.json());
    UI.stopLoading();

    if (!data.history || data.history.length === 0) {
      UI.modal({
        title: `Historial Completo: ${nombre}`,
        body: '<p class="text-center py-10 text-muted-foreground italic">No hay movimientos registrados para este espacio.</p>',
        hideConfirm: true
      });
      return;
    }

    const currentUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    const isAuthorizedToDelete = typeof canDelete !== 'undefined' ? canDelete(currentUser) : (currentUser && (currentUser.role === 'admin' || currentUser.can_delete == 1));

    const historyHTML = `
      <div class="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        ${data.history.map(h => {
          let icon = 'circle', color = 'bg-muted text-muted-foreground', label = 'EVENTO', detail = '';
          if (h.event_type === 'traslado') {
            const isEntry = h.destino === nombre || !h.origen;
            icon  = isEntry ? 'arrow-down-left' : 'arrow-up-right';
            color = isEntry ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
            label = isEntry ? 'INGRESO MOBILIARIO' : 'SALIDA MOBILIARIO';
            detail = isEntry ? `Desde: ${h.origen || 'Almacén'}` : `Hacia: ${h.destino || 'Baja / Almacén'}`;
          } else if (h.event_type === 'mantenimiento') {
            icon = 'wrench'; color = 'bg-blue-100 text-blue-700';
            label = `MANTENIMIENTO ${h.tipo}`;
            detail = `Equipo: ${h.item_name} | Técnico: ${h.tecnico || '—'}`;
          } else if (h.event_type === 'responsable') {
            icon = 'user'; color = 'bg-purple-100 text-purple-700';
            label = 'CAMBIO DE RESPONSABLE';
            detail = `Nuevo encargado: ${h.item_name}`;
          } else if (h.event_type === 'uso_espacio') {
            icon = 'history'; color = 'bg-indigo-100 text-indigo-700';
            label = 'USO Y RESPONSABLE DEL ESPACIO';
            const finText = h.fecha_hasta ? h.fecha_hasta : 'Actualidad';
            detail = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 mb-1">
                        <i data-lucide="building-2" class="w-2.5 h-2.5"></i>${h.sub_tipo || 'Sin tipo'}
                      </span><br>
                      <strong>Responsable:</strong> ${h.item_name || 'Sin asignar'}<br>
                      <span class="text-[10px] text-muted-foreground">Período: del ${h.fecha} al ${finText}</span>`;
          }
          
          const cardTitle = h.event_type === 'traslado' 
            ? `${h.cantidad} x ${h.item_name}` 
            : (h.event_type === 'uso_espacio' ? (h.sub_nombre || 'Sin nombre registrado') : h.item_name);

          return `
            <div class="pl-8 relative">
              <div class="absolute left-0 top-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${color} z-10">
                <i data-lucide="${icon}" class="w-3 h-3"></i>
              </div>
              <div class="p-3 rounded-xl border border-border bg-white shadow-sm">
                <div class="flex justify-between items-start mb-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider">${label}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-muted-foreground font-mono">${h.fecha}</span>
                    ${isAuthorizedToDelete ? `
                    <button class="btn btn-ghost p-1 text-destructive hover:bg-destructive/10 rounded" 
                            title="Eliminar del historial"
                            onclick="deleteHistoryItem(event, ${h.id}, '${h.event_type}', ${id}, '${nombre.replace(/'/g, "\\'")}')">
                      <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>` : ''}
                  </div>
                </div>
                <div class="text-sm font-bold">${cardTitle}</div>
                <div class="text-xs text-muted-foreground mt-0.5">${detail}</div>
                ${h.motivo ? `<div class="mt-2 pt-2 border-t text-xs text-muted-foreground italic">"${h.motivo}"</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    UI.modal({
      title: `Historial de Actividad: ${nombre}`,
      body: `<div class="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pt-2">${historyHTML}</div>`,
      hideConfirm: true, confirmText: 'Cerrar'
    });
    lucide.createIcons();
  } catch (e) {
    UI.stopLoading();
    UI.toast('Error al cargar historial', 'error');
  }
};

window.deleteHistoryItem = function(e, id, event_type, locId, locNombre) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  let labelDesc = 'el cambio de estado/uso';
  if (event_type === 'traslado') labelDesc = 'el traslado de mobiliario';
  if (event_type === 'mantenimiento') labelDesc = 'el registro de mantenimiento';

  UI.modal({
    title: 'Eliminar de Historial',
    body: `<p>¿Está seguro de que desea eliminar permanentemente <strong>${labelDesc}</strong> del historial?</p>
           <p class="text-xs text-destructive mt-2 font-bold italic">Advertencia: Esta acción es irreversible y eliminará el registro de forma permanente.</p>`,
    confirmText: 'Sí, eliminar',
    confirmClass: 'btn-destructive',
    onConfirm: async () => {
      UI.loading('Eliminando registro de historial...');
      try {
        const res = await fetch(`api/unified_history.php?action=delete&event_type=${event_type}&id=${id}`, {
          method: 'DELETE'
        }).then(r => r.json());

        UI.stopLoading();
        if (res.ok) {
          UI.toast('Registro eliminado exitosamente ✓', 'success');
          // Volver a cargar el historial unificado sin cerrar el modal principal
          viewLocationHistory(locId, locNombre);
        } else {
          UI.toast('Error: ' + res.error, 'error');
        }
      } catch (err) {
        UI.stopLoading();
        UI.toast('Error al comunicarse con el servidor', 'error');
      }
    }
  });
};

window.viewLocationInventory = async function(id, nombre) {
  UI.loading('Calculando inventario...');
  try {
    const resp = await fetch('api/transfers.php').then(r => r.json());
    UI.stopLoading();

    const transfers = resp.transfers || [];
    const history   = transfers.filter(t => t.ubicacion_origen_id == id || t.ubicacion_destino_id == id);

    const stockMap = {};
    history.forEach(t => {
      if (!stockMap[t.item_nombre]) stockMap[t.item_nombre] = 0;
      if (t.ubicacion_destino_id == id) stockMap[t.item_nombre] += parseInt(t.cantidad);
      if (t.ubicacion_origen_id  == id) stockMap[t.item_nombre] -= parseInt(t.cantidad);
    });

    const activeItems = Object.entries(stockMap).filter(([_, qty]) => qty > 0);

    const bodyHTML = activeItems.length === 0
      ? '<div class="text-center py-10 text-muted-foreground italic">Este espacio no tiene mobiliario asignado actualmente.</div>'
      : `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          ${activeItems.map(([name, qty]) => `
            <div class="p-3 rounded-lg border border-border bg-white shadow-sm flex justify-between items-center">
              <div>
                <div class="text-xs font-bold text-primary uppercase">${name}</div>
                <div class="text-[10px] text-muted-foreground italic">Cantidad en este espacio</div>
              </div>
              <div class="text-xl font-black text-primary">${qty}</div>
            </div>`).join('')}
        </div>
        <p class="text-[10px] text-muted-foreground italic text-center">Basado en el historial de traslados y retornos.</p>`;

    UI.modal({
      title: `Inventario Actual: ${nombre}`,
      body: `<div class="pt-2">${bodyHTML}</div>`,
      hideConfirm: true, confirmText: 'Cerrar'
    });
  } catch (e) {
    UI.stopLoading();
    UI.toast('Error al cargar inventario', 'error');
  }
};

window.Views.locations.afterMount = loadLocations;
