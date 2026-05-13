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
      <tr class="${l.estado === 'inactivo' ? 'bg-muted/30' : ''}">
        <td class="font-mono text-xs font-bold text-primary ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${l.codigo || '—'}</td>
        <td class="${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">
          <div class="font-medium text-sm">${l.nombre}</div>
        </td>
        <td class="text-xs uppercase font-semibold ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${l.tipo || '—'}</td>
        <td class="text-xs text-muted-foreground uppercase font-bold ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${l.sede_nombre || '—'}</td>
        <td class="${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${l.responsable_nombre || '<span class="text-muted-foreground text-xs italic">Sin responsable</span>'}</td>
        <td class="text-right whitespace-nowrap">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5 ${l.estado === 'activo' ? 'text-destructive' : 'text-green-500'}" 
                    title="${l.estado === 'activo' ? 'Dar de baja' : 'Activar'}" 
                    onclick="toggleLocationStatus(${l.id}, '${l.estado}', '${l.nombre.replace(/'/g, "\\'")}')">
              <i data-lucide="${l.estado === 'activo' ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
            </button>
            <button class="btn btn-ghost p-1.5 ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Ver Inventario Actual" onclick="viewLocationInventory(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')"><i data-lucide="eye" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Ver Historial de Responsables" onclick="viewLocationHistory(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')"><i data-lucide="history" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Editar" onclick="editLocation(${l.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 text-destructive ${l.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Eliminar" onclick="deleteLocation(${l.id}, '${l.nombre.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
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
      <div class="md:col-span-2"><label class="text-sm font-medium">Estado</label>
        <select id="loc-estado" class="select mt-1 w-full">
          <option value="activo" ${l && l.estado === 'activo' ? 'selected' : ''}>Activo</option>
          <option value="inactivo" ${l && l.estado === 'inactivo' ? 'selected' : ''}>Inactivo (De Baja)</option>
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
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return false; }
      
      const body = {
        codigo: document.getElementById('loc-codigo').value.trim(),
        nombre,
        tipo: document.getElementById('loc-tipo').value,
        sede_id,
        responsable_id: document.getElementById('loc-responsable').value || null,
        estado: document.getElementById('loc-estado').value
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
      if (!nombre || !sede_id) { UI.toast('Nombre y Sede son obligatorios', 'error'); return false; }
      
      const body = {
        id,
        codigo: document.getElementById('loc-codigo').value.trim(),
        nombre,
        tipo: document.getElementById('loc-tipo').value,
        sede_id,
        responsable_id: document.getElementById('loc-responsable').value || null,
        estado: document.getElementById('loc-estado').value
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

window.toggleLocationStatus = async function(id, currentStatus, name) {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    const action = newStatus === 'activo' ? 'activar' : 'dar de baja';
    
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

        const historyHTML = `
            <div class="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                ${data.history.map(h => {
                    let icon = 'circle';
                    let color = 'bg-muted text-muted-foreground';
                    let label = 'EVENTO';
                    let detail = '';

                    if (h.event_type === 'traslado') {
                        const isEntry = h.destino === nombre || !h.origen;
                        icon = isEntry ? 'arrow-down-left' : 'arrow-up-right';
                        color = isEntry ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
                        label = isEntry ? 'INGRESO MOBILIARIO' : 'SALIDA MOBILIARIO';
                        detail = isEntry ? `Desde: ${h.origen || 'Almacén'}` : `Hacia: ${h.destino || 'Baja / Almacén'}`;
                    } else if (h.event_type === 'mantenimiento') {
                        icon = 'wrench';
                        color = 'bg-blue-100 text-blue-700';
                        label = `MANTENIMIENTO ${h.tipo}`;
                        detail = `Equipo: ${h.item_name} | Técnico: ${h.tecnico || '—'}`;
                    } else if (h.event_type === 'responsable') {
                        icon = 'user';
                        color = 'bg-purple-100 text-purple-700';
                        label = 'CAMBIO DE RESPONSABLE';
                        detail = `Nuevo encargado: ${h.item_name}`;
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
                                <div class="text-sm font-bold">${h.event_type === 'traslado' ? `${h.cantidad} x ${h.item_name}` : h.item_name}</div>
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

window.viewLocationInventory = async function(id, nombre) {
    UI.loading('Calculando inventario...');
    try {
        const resp = await fetch('api/transfers.php').then(r => r.json());
        UI.stopLoading();
        
        const transfers = resp.transfers || [];
        const history = transfers.filter(t => t.ubicacion_origen_id == id || t.ubicacion_destino_id == id);

        const stockMap = {};
        history.forEach(t => {
            if (!stockMap[t.item_nombre]) stockMap[t.item_nombre] = 0;
            if (t.ubicacion_destino_id == id) stockMap[t.item_nombre] += parseInt(t.cantidad);
            if (t.ubicacion_origen_id == id) stockMap[t.item_nombre] -= parseInt(t.cantidad);
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
                        </div>
                    `).join('')}
                </div>
                <p class="text-[10px] text-muted-foreground italic text-center">Basado en el historial de traslados y retornos.</p>
            `;

        UI.modal({
            title: `Inventario Actual: ${nombre}`,
            body: `<div class="pt-2">${bodyHTML}</div>`,
            hideConfirm: true,
            confirmText: 'Cerrar'
        });
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar inventario', 'error');
    }
};

window.Views.locations.afterMount = loadLocations;
