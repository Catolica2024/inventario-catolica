// assets/js/views/suppliers.js — Gestión de Proveedores

async function loadSuppliers() {
  const tbody = document.getElementById('suppliers-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/suppliers.php').then(r => r.json());
    if (!data.suppliers || data.suppliers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground">No hay proveedores registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = data.suppliers.map(s => `
      <tr class="${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">
        <td>
          <div class="font-bold text-sm">${s.razon_social}</div>
          <div class="text-[10px] text-muted-foreground font-mono uppercase">${s.ruc || 'Sin RUC'}</div>
        </td>
        <td class="text-xs uppercase font-semibold">${s.categoria_nombre || 'General'}</td>
        <td class="text-xs font-medium">${s.contacto || '—'}</td>
        <td class="text-xs">${s.telefono || '—'}</td>
        <td><span class="badge ${s.estado === 'activo' ? 'badge-green' : 'badge-red'}">${s.estado}</span></td>
        <td class="text-right">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5" onclick="editSupplier(${s.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteSupplier(${s.id}, '${s.razon_social.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-destructive">Error al cargar proveedores.</td></tr>'; }
}

window.newSupplier = async function() {
    const catsResp = await fetch('api/categories_inventario.php').then(r => r.json());
    const cats = catsResp.categories || [];

    UI.modal({
        title: 'Registrar Nuevo Proveedor',
        body: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="text-sm font-medium">Razón Social <span class="text-destructive">*</span></label>
                    <input id="sup-name" class="input mt-1 w-full" placeholder="Ej: Corporación SAC">
                </div>
                <div>
                    <label class="text-sm font-medium">RUC / DNI</label>
                    <input id="sup-ruc" class="input mt-1 w-full" maxlength="11" placeholder="20555555555">
                </div>
                <div>
                    <label class="text-sm font-medium">Categoría / Rubro</label>
                    <select id="sup-cat" class="select mt-1 w-full">
                        <option value="">Seleccione...</option>
                        ${cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-medium">Nombre de Contacto</label>
                    <input id="sup-contact" class="input mt-1 w-full" placeholder="Ej: Juan Pérez">
                </div>
                <div>
                    <label class="text-sm font-medium">Teléfono / WhatsApp</label>
                    <input id="sup-phone" class="input mt-1 w-full" placeholder="987654321">
                </div>
                <div class="md:col-span-2">
                    <label class="text-sm font-medium">Dirección Fiscal</label>
                    <input id="sup-address" class="input mt-1 w-full" placeholder="Av. Los Pinos 123">
                </div>
            </div>
        `,
        confirmText: 'Guardar Proveedor',
        onConfirm: async () => {
            const name = document.getElementById('sup-name').value.trim();
            if (!name) { UI.toast('La Razón Social es obligatoria', 'error'); return; }
            
            const body = {
                razon_social: name,
                ruc: document.getElementById('sup-ruc').value,
                categoria_id: document.getElementById('sup-cat').value || null,
                contacto: document.getElementById('sup-contact').value,
                telefono: document.getElementById('sup-phone').value,
                direccion: document.getElementById('sup-address').value
            };

            const res = await fetch('api/suppliers.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
            if (res.ok) { UI.toast('Proveedor guardado', 'success'); loadSuppliers(); }
            else UI.toast('Error: ' + res.error, 'error');
        }
    });
};

window.Views.suppliers = function() {
  return `
    ${UI.pageHeader('Gestión de Proveedores','Directorio maestro de socios comerciales', `
      <button class="btn btn-primary" onclick="newSupplier()"><i data-lucide="plus"></i>Nuevo Proveedor</button>
    `)}
    <div class="card overflow-hidden">
      <table class="data">
        <thead><tr><th>Proveedor / RUC</th><th>Rubro</th><th>Contacto</th><th>Teléfono</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead>
        <tbody id="suppliers-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando proveedores...</td></tr></tbody>
      </table>
    </div>`;
};

window.Views.suppliers.afterMount = loadSuppliers;
