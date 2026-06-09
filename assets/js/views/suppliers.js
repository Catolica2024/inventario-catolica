// assets/js/views/suppliers.js — Gestión de Proveedores

let _allSuppliers = [];

async function loadSuppliers() {
  const tbody = document.getElementById('suppliers-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/suppliers.php').then(r => r.json());
    _allSuppliers = data.suppliers || [];
    renderSuppliers(_allSuppliers);
  } catch { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-destructive">Error al cargar proveedores.</td></tr>'; }
}

function renderSuppliers(list) {
  const tbody = document.getElementById('suppliers-table-body');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground">No hay proveedores que coincidan.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr class="${s.estado === 'inactivo' ? 'bg-muted/30' : ''}">
      <td class="${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">
        <div class="font-bold text-sm">${s.razon_social}</div>
        <div class="text-[10px] text-muted-foreground font-mono uppercase">${s.ruc || 'Sin RUC'}</div>
      </td>
      <td class="text-xs uppercase font-semibold ${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${s.categoria_nombre || 'General'}</td>
      <td class="text-xs font-medium ${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${s.contacto || '—'}</td>
      <td class="text-xs ${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}">${s.telefono || '—'}</td>
      <td class="${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}"><span class="badge ${s.estado === 'activo' ? 'badge-green' : 'badge-red'}">${s.estado}</span></td>
      <td class="text-right">
        <div class="flex justify-end gap-1">
          <button class="btn btn-ghost p-1.5 ${s.estado === 'activo' ? 'text-destructive' : 'text-green-500'}" 
                  title="${s.estado === 'activo' ? 'Dar de baja' : 'Activar'}" 
                  onclick="toggleSupplierStatus(${s.id}, '${s.estado}', '${s.razon_social.replace(/'/g, "\\'")}')"> 
            <i data-lucide="${s.estado === 'activo' ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
          </button>
          <button class="btn btn-ghost p-1.5 ${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Editar" onclick="editSupplier(${s.id})"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          ${window.canDelete(window.Auth.getUser()) ? 
            `<button class="btn btn-ghost p-1.5 text-destructive ${s.estado === 'inactivo' ? 'opacity-50 grayscale' : ''}" title="Eliminar" onclick="deleteSupplier(${s.id}, '${s.razon_social.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
            ''
          }
        </div>
      </td>
    </tr>`).join('');
  lucide.createIcons();
}

window.filterSuppliers = function () {
  const q = (document.getElementById('suppliers-search')?.value || '').toLowerCase().trim();
  if (!q) {
    renderSuppliers(_allSuppliers);
    return;
  }
  const filtered = _allSuppliers.filter(s =>
    (s.razon_social || '').toLowerCase().includes(q) ||
    (s.ruc || '').toLowerCase().includes(q) ||
    (s.contacto || '').toLowerCase().includes(q) ||
    (s.categoria_nombre || '').toLowerCase().includes(q) ||
    (s.telefono || '').toLowerCase().includes(q)
  );
  renderSuppliers(filtered);
};

const BANCOS_LIST = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'Caja Huancayo', 'Otro'];

function buildBancoCombobox(inputId, dropdownId, hiddenId, initialValue = '') {
    return `
        <div class="relative banco-combobox-wrapper" style="position:relative">
            <input id="${inputId}" class="input mt-1 w-full" placeholder="Buscar banco..." autocomplete="off"
                value="${initialValue}"
                oninput="filterBancoDropdown('${inputId}','${dropdownId}','${hiddenId}')"
                onfocus="showBancoDropdown('${inputId}','${dropdownId}','${hiddenId}')"
                onblur="hideBancoDropdown('${dropdownId}')">
            <input type="hidden" id="${hiddenId}" value="${initialValue}">
            <ul id="${dropdownId}" class="banco-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;background:var(--card);border:1px solid var(--border);border-radius:0.5rem;margin-top:2px;max-height:180px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,0.18);list-style:none;padding:4px 0;">
                ${BANCOS_LIST.map(b => `<li data-value="${b}" style="padding:8px 14px;cursor:pointer;font-size:0.875rem;transition:background 0.15s;" onmousedown="selectBancoOption('${inputId}','${dropdownId}','${hiddenId}','${b}')" onmouseover="this.style.background='var(--accent)'" onmouseout="this.style.background=''"> ${b}</li>`).join('')}
            </ul>
        </div>`;
}

window.showBancoDropdown = function(inputId, dropdownId, hiddenId) {
    const q = document.getElementById(inputId)?.value.trim().toLowerCase() || '';
    filterBancoDropdown(inputId, dropdownId, hiddenId);
    document.getElementById(dropdownId).style.display = 'block';
};

window.hideBancoDropdown = function(dropdownId) {
    setTimeout(() => {
        const el = document.getElementById(dropdownId);
        if (el) el.style.display = 'none';
    }, 180);
};

window.filterBancoDropdown = function(inputId, dropdownId, hiddenId) {
    const q = (document.getElementById(inputId)?.value || '').trim().toLowerCase();
    const ul = document.getElementById(dropdownId);
    if (!ul) return;
    let anyVisible = false;
    ul.querySelectorAll('li').forEach(li => {
        const match = li.dataset.value.toLowerCase().includes(q);
        li.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
    });
    ul.style.display = anyVisible ? 'block' : 'none';
    // Si el texto no coincide exactamente con una opción, limpiar el hidden
    const exact = BANCOS_LIST.find(b => b.toLowerCase() === q);
    if (!exact) document.getElementById(hiddenId).value = '';
};

window.selectBancoOption = function(inputId, dropdownId, hiddenId, value) {
    document.getElementById(inputId).value = value;
    document.getElementById(hiddenId).value = value;
    document.getElementById(dropdownId).style.display = 'none';
};

window.newSupplier = async function() {
    const resp = await fetch('api/rubros.php').then(r => r.json());
    const rubros = resp.rubros || [];

    UI.modal({
        title: 'Registrar Nuevo Proveedor',
        body: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="text-sm font-medium">Razón Social <span class="text-destructive">*</span></label>
                    <input id="sup-name" class="input mt-1 w-full" placeholder="Ej: Corporación SAC">
                </div>
                <div>
                    <label class="text-sm font-medium">RUC / DNI <span class="text-destructive">*</span></label>
                    <input id="sup-ruc" class="input mt-1 w-full" maxlength="11" placeholder="20555555555">
                </div>
                <div>
                    <label class="text-sm font-medium">Rubro del Proveedor</label>
                    <select id="sup-rubro" class="select mt-1 w-full">
                        <option value="">Seleccione rubro...</option>
                        ${rubros.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}
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
                <div>
                    <label class="text-sm font-medium">Email del Proveedor</label>
                    <input id="sup-email" type="text" class="input mt-1 w-full" placeholder="proveedor@empresa.com">
                </div>
                <div class="md:col-span-2">
                    <label class="text-sm font-medium">Dirección Fiscal</label>
                    <input id="sup-address" class="input mt-1 w-full" placeholder="Av. Los Pinos 123">
                </div>
                
                <div class="md:col-span-2 border-t pt-2 mt-2">
                    <h3 class="text-xs font-bold text-primary uppercase tracking-wider">Información Bancaria</h3>
                </div>
                <div>
                    <label class="text-sm font-medium">Banco <span class="text-destructive">*</span></label>
                    ${buildBancoCombobox('sup-banco-input', 'sup-banco-dropdown', 'sup-banco')}
                </div>
                <div>
                    <label class="text-sm font-medium">Nro. de Cuenta Bancaria <span class="text-destructive">*</span></label>
                    <input id="sup-cuenta" class="input mt-1 w-full" placeholder="191-xxxxxxxx-x-xx">
                </div>
                <div>
                    <label class="text-sm font-medium">CCI (Código Interbancario)</label>
                    <input id="sup-cci" class="input mt-1 w-full" placeholder="002-xxxxxxxxxxxxxxxx-xx">
                </div>
                <div>
                    <label class="text-sm font-medium">Cuenta de Detracción</label>
                    <input id="sup-detraccion" class="input mt-1 w-full" placeholder="Ej: 00-xxx-xxxxxx">
                </div>
            </div>
        `,
        confirmText: 'Guardar Proveedor',
        onConfirm: async () => {
            const name = document.getElementById('sup-name').value.trim();
            const ruc = document.getElementById('sup-ruc').value.trim();
            const banco = document.getElementById('sup-banco').value.trim() ||
                          document.getElementById('sup-banco-input').value.trim();
            const cuenta = document.getElementById('sup-cuenta').value.trim();
            if (!name) { UI.toast('La Razón Social es obligatoria', 'error'); return false; }
            if (!ruc) { UI.toast('El RUC / DNI es obligatorio', 'error'); return false; }
            if (!banco) { UI.toast('El Banco es obligatorio', 'error'); return false; }
            if (!cuenta) { UI.toast('El Nro. de Cuenta Bancaria es obligatorio', 'error'); return false; }
            
            const body = {
                razon_social: name,
                ruc: ruc,
                rubro_id: document.getElementById('sup-rubro').value || null,
                contacto: document.getElementById('sup-contact').value.trim(),
                telefono: document.getElementById('sup-phone').value.trim(),
                email: document.getElementById('sup-email').value.trim() || null,
                direccion: document.getElementById('sup-address').value.trim(),
                banco: banco,
                numero_cuenta: cuenta,
                cci: document.getElementById('sup-cci').value.trim() || null,
                cuenta_detraccion: document.getElementById('sup-detraccion').value.trim() || null
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
    <div class="card">
      <div class="p-4 border-b border-border">
        <div class="relative max-w-sm">
          <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"></i>
          <input id="suppliers-search" type="text" class="input pl-9 w-full" placeholder="Buscar por nombre, RUC, contacto, rubro..." oninput="filterSuppliers()">
        </div>
      </div>
      <div class="table-container">
        <table class="data">
          <thead><tr><th>Proveedor / RUC</th><th>Rubro</th><th>Contacto</th><th>Teléfono</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead>
          <tbody id="suppliers-table-body"><tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando proveedores...</td></tr></tbody>
        </table>
      </div>
    </div>`;
};

window.toggleSupplierStatus = async function(id, currentStatus, name) {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    const action = newStatus === 'activo' ? 'activar' : 'dar de baja';
    const isDarDeBaja = newStatus === 'inactivo';
    
    UI.modal({
        title: `${newStatus === 'activo' ? 'Activar' : 'Dar de baja'} Proveedor`,
        body: `
          <p class="mb-3">¿Está seguro de que desea <strong>${action}</strong> al proveedor <strong>${name}</strong>?</p>
          ${isDarDeBaja ? `
            <div class="mt-3">
              <label class="text-sm font-medium">Motivo de baja <span class="text-destructive">*</span></label>
              <textarea id="supplier-baja-motivo" class="input mt-1 w-full h-20 resize-none" placeholder="Indique el motivo por el cual se da de baja a este proveedor..."></textarea>
            </div>
          ` : ''}
        `,
        confirmText: `Sí, ${action}`,
        onConfirm: async () => {
            if (isDarDeBaja) {
              const motivoEl = document.getElementById('supplier-baja-motivo');
              const motivo = motivoEl ? motivoEl.value.trim() : '';
              if (!motivo) { UI.toast('Debe ingresar el motivo de baja', 'error'); return false; }
            }
            UI.loading('Actualizando estado...');
            try {
                // Obtenemos los datos actuales primero
                const data = await fetch('api/suppliers.php').then(r => r.json());
                const s = data.suppliers.find(x => x.id == id);
                if (!s) throw new Error('Proveedor no encontrado');

                const motivoEl = isDarDeBaja ? document.getElementById('supplier-baja-motivo') : null;
                const motivo = motivoEl ? motivoEl.value.trim() : '';

                const body = { 
                    ...s, 
                    estado: newStatus,
                    motivo_baja: isDarDeBaja ? motivo : null
                };
                const res = await fetch('api/suppliers.php', { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(body) 
                }).then(r => r.json());

                UI.stopLoading();
                if (res.ok) {
                    UI.toast(`Proveedor ${newStatus === 'activo' ? 'activado' : 'dado de baja'}`, 'success');
                    loadSuppliers();
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

window.editSupplier = async function(id) {
    const [supResp, catsResp] = await Promise.all([
        fetch('api/suppliers.php').then(r => r.json()),
        fetch('api/rubros.php').then(r => r.json()) // Se usa rubros para categorizar proveedores
    ]);
    const s = (supResp.suppliers || []).find(x => x.id == id);
    if (!s) return;

    const cats = catsResp.rubros || [];

    UI.modal({
        title: 'Editar Proveedor',
        body: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="text-sm font-medium">Razón Social <span class="text-destructive">*</span></label>
                    <input id="sup-name" class="input mt-1 w-full" value="${s.razon_social || ''}">
                </div>
                <div>
                    <label class="text-sm font-medium">RUC / DNI <span class="text-destructive">*</span></label>
                    <input id="sup-ruc" class="input mt-1 w-full" maxlength="11" value="${s.ruc || ''}">
                </div>
                <div>
                    <label class="text-sm font-medium">Rubro</label>
                    <select id="sup-cat" class="select mt-1 w-full">
                        <option value="">Seleccione...</option>
                        ${cats.map(c => `<option value="${c.id}" ${s.rubro_id == c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-medium">Estado</label>
                    <select id="sup-estado" class="select mt-1 w-full">
                        <option value="activo" ${s.estado === 'activo' ? 'selected' : ''}>Activo</option>
                        <option value="inactivo" ${s.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                    </select>
                </div>
                <div>
                    <label class="text-sm font-medium">Nombre de Contacto</label>
                    <input id="sup-contact" class="input mt-1 w-full" value="${s.contacto || ''}">
                </div>
                <div>
                    <label class="text-sm font-medium">Teléfono / WhatsApp</label>
                    <input id="sup-phone" class="input mt-1 w-full" value="${s.telefono || ''}">
                </div>
                <div>
                    <label class="text-sm font-medium">Email del Proveedor</label>
                    <input id="sup-email" type="text" class="input mt-1 w-full" value="${s.email || ''}">
                </div>
                <div class="md:col-span-2">
                    <label class="text-sm font-medium">Dirección Fiscal</label>
                    <input id="sup-address" class="input mt-1 w-full" value="${s.direccion || ''}">
                </div>
                
                <div class="md:col-span-2 border-t pt-2 mt-2">
                    <h3 class="text-xs font-bold text-primary uppercase tracking-wider">Información Bancaria</h3>
                </div>
                <div>
                    <label class="text-sm font-medium">Banco <span class="text-destructive">*</span></label>
                    ${buildBancoCombobox('sup-banco-input', 'sup-banco-dropdown', 'sup-banco', s.banco || '')}
                </div>
                <div>
                    <label class="text-sm font-medium">Nro. de Cuenta Bancaria <span class="text-destructive">*</span></label>
                    <input id="sup-cuenta" class="input mt-1 w-full" value="${s.numero_cuenta || ''}" placeholder="191-xxxxxxxx-x-xx">
                </div>
                <div>
                    <label class="text-sm font-medium">CCI (Código Interbancario)</label>
                    <input id="sup-cci" class="input mt-1 w-full" value="${s.cci || ''}" placeholder="002-xxxxxxxxxxxxxxxx-xx">
                </div>
                <div>
                    <label class="text-sm font-medium">Cuenta de Detracción</label>
                    <input id="sup-detraccion" class="input mt-1 w-full" value="${s.cuenta_detraccion || ''}" placeholder="Ej: 00-xxx-xxxxxx">
                </div>
            </div>
        `,
        confirmText: 'Guardar Cambios',
        onConfirm: async () => {
            const name = document.getElementById('sup-name').value.trim();
            const ruc  = document.getElementById('sup-ruc').value.trim();
            const banco = document.getElementById('sup-banco').value.trim() ||
                          document.getElementById('sup-banco-input').value.trim();
            const cuenta = document.getElementById('sup-cuenta').value.trim();
            if (!name) { UI.toast('La Razón Social es obligatoria', 'error'); return false; }
            if (!ruc) { UI.toast('El RUC / DNI es obligatorio', 'error'); return false; }
            if (!banco) { UI.toast('El Banco es obligatorio', 'error'); return false; }
            if (!cuenta) { UI.toast('El Nro. de Cuenta Bancaria es obligatorio', 'error'); return false; }

            const body = {
                id: s.id,
                razon_social: name,
                ruc: ruc,
                rubro_id: document.getElementById('sup-cat').value || null,
                contacto: document.getElementById('sup-contact').value.trim(),
                telefono: document.getElementById('sup-phone').value.trim(),
                email: document.getElementById('sup-email').value.trim() || null,
                direccion: document.getElementById('sup-address').value.trim(),
                estado: document.getElementById('sup-estado').value,
                banco: banco,
                numero_cuenta: cuenta,
                cci: document.getElementById('sup-cci').value.trim() || null,
                cuenta_detraccion: document.getElementById('sup-detraccion').value.trim() || null
            };

            const res = await fetch('api/suppliers.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
            if (res.ok) { UI.toast('Proveedor actualizado', 'success'); loadSuppliers(); }
            else UI.toast('Error: ' + res.error, 'error');
        }
    });
};

window.deleteSupplier = function(id, nombre) {
    if (!window.canDelete(window.Auth.getUser())) {
        UI.toast('Solo el Administrador puede eliminar proveedores', 'error');
        return;
    }
    UI.modal({
        title: 'Eliminar Proveedor',
        body: `<p>¿Está seguro de eliminar a <strong>${nombre}</strong>? Esta acción fallará si el proveedor tiene órdenes de compra vinculadas.</p>`,
        confirmText: 'Sí, eliminar',
        onConfirm: async () => {
            const res = await fetch(`api/suppliers.php?id=${id}`, { method: 'DELETE' }).then(r => r.json());
            if (res.ok) { UI.toast('Proveedor eliminado', 'success'); loadSuppliers(); }
            else UI.toast('Error: ' + res.error, 'error');
        }
    });
};

window.Views.suppliers.afterMount = loadSuppliers;
