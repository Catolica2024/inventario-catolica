window.Views = window.Views || {};

window.Views.treasury = function() {
  return `
    ${UI.pageHeader('Tesorería','Gestión de pagos y vouchers para OC/OS', `
      <div class="flex gap-2">
        <button class="btn btn-outline" onclick="loadTreasuryData()"><i data-lucide="refresh-cw"></i>Actualizar</button>
      </div>
    `)}

    <div class="space-y-6">
      <!-- Filtros y tabs -->
      <div class="card p-2 flex gap-1 bg-muted/20 w-fit">
        <button id="tab-pending" class="btn btn-ghost px-6 py-2 rounded-lg bg-white shadow-sm" onclick="switchTreasuryTab('pending')">Pendientes de Pago</button>
        <button id="tab-history" class="btn btn-ghost px-6 py-2 rounded-lg" onclick="switchTreasuryTab('history')">Historial de Pagos</button>
      </div>

      <!-- Tabla principal -->
      <div class="card overflow-hidden">
        <table class="data">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Proveedor</th>
              <th>Fecha Emisión</th>
              <th>Monto</th>
              <th>Estado Pago</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="treasury-table-body">
            <tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando datos...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
};

let _treasuryData = [];
let _treasuryCurrentTab = 'pending';

window.switchTreasuryTab = function(tab) {
    _treasuryCurrentTab = tab;
    document.getElementById('tab-pending').classList.toggle('bg-white', tab === 'pending');
    document.getElementById('tab-pending').classList.toggle('shadow-sm', tab === 'pending');
    document.getElementById('tab-history').classList.toggle('bg-white', tab === 'history');
    document.getElementById('tab-history').classList.toggle('shadow-sm', tab === 'history');
    renderTreasuryTable();
};

window.Views.treasury.afterMount = loadTreasuryData;

async function loadTreasuryData() {
    const tbody = document.getElementById('treasury-table-body');
    if (!tbody) return;
    try {
        const resp = await fetch('api/purchases.php').then(r => r.json());
        // Solo mostrar aprobadas
        _treasuryData = (resp.purchases || []).filter(p => p.estado === 'Aprobada');
        renderTreasuryTable();
    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>';
    }
}

function renderTreasuryTable() {
    const tbody = document.getElementById('treasury-table-body');
    if (!tbody) return;

    const list = _treasuryData.filter(p => {
        if (_treasuryCurrentTab === 'pending') return p.pagado == 0;
        return p.pagado == 1;
    });

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay ${ _treasuryCurrentTab === 'pending' ? 'pagos pendientes' : 'historial de pagos' }.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr>
            <td class="font-mono text-xs font-bold">${p.numero_oc}</td>
            <td class="font-medium">${p.proveedor_nombre}</td>
            <td class="text-xs">${p.fecha || '—'}</td>
            <td class="font-bold text-primary">S/ ${parseFloat(p.total || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</td>
            <td>
                ${p.pagado == 1 
                    ? '<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Pagado</span>' 
                    : '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Pendiente</span>'}
            </td>
            <td class="text-right">
                <button class="btn btn-primary btn-sm" onclick="openPaymentDetails(${p.id})">
                    <i data-lucide="${p.pagado == 1 ? 'eye' : 'credit-card'}"></i>
                    ${p.pagado == 1 ? 'Ver Detalle' : 'Realizar Pago'}
                </button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.openPaymentDetails = async function(id) {
    const p = _treasuryData.find(x => x.id == id);
    if (!p) return;

    // Obtener datos extendidos del proveedor
    const supResp = await fetch('api/suppliers.php').then(r => r.json());
    const sup = supResp.suppliers.find(s => s.id == p.proveedor_id) || {};

    const body = `
        <div class="space-y-6">
            <!-- Información del Documento -->
            <div class="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-lg">
                <div><span class="text-muted-foreground block uppercase text-[10px] font-bold">Documento</span> <strong>${p.numero_oc}</strong></div>
                <div><span class="text-muted-foreground block uppercase text-[10px] font-bold">Monto Total</span> <strong class="text-primary text-lg">S/ ${parseFloat(p.total).toLocaleString('es-PE', {minimumFractionDigits:2})}</strong></div>
                <div class="col-span-2"><span class="text-muted-foreground block uppercase text-[10px] font-bold">Concepto / Notas</span> ${p.observaciones || 'Sin observaciones'}</div>
            </div>

            <!-- Información Bancaria del Proveedor -->
            <div class="card p-4 border-primary/20 bg-primary/5">
                <h4 class="font-bold flex items-center gap-2 mb-3 text-primary"><i data-lucide="landmark" class="w-4 h-4"></i>Datos del Proveedor para Pago</h4>
                <div class="space-y-3">
                    <div>
                        <label class="text-[10px] uppercase font-bold text-muted-foreground block">Razón Social</label>
                        <div class="flex items-center justify-between">
                            <span class="font-medium">${sup.razon_social}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] uppercase font-bold text-muted-foreground block">Número de Cuenta</label>
                            <div class="flex items-center justify-between bg-white p-2 rounded border border-border mt-1">
                                <span class="font-mono text-xs">${sup.numero_cuenta || 'No registrado'}</span>
                                ${sup.numero_cuenta ? `<button class="text-primary p-1 hover:bg-primary/10 rounded" onclick="copyToClipboard('${sup.numero_cuenta}')" title="Copiar"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>` : ''}
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-muted-foreground block">CCI (Interbancario)</label>
                            <div class="flex items-center justify-between bg-white p-2 rounded border border-border mt-1">
                                <span class="font-mono text-xs">${sup.cci || 'No registrado'}</span>
                                ${sup.cci ? `<button class="text-primary p-1 hover:bg-primary/10 rounded" onclick="copyToClipboard('${sup.cci}')" title="Copiar"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>` : ''}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] uppercase font-bold text-muted-foreground block">Email para Notificación</label>
                        <div class="text-sm">${sup.email || 'No registrado'}</div>
                    </div>
                </div>
            </div>

            ${p.pagado == 0 ? `
                <!-- Formulario de Pago -->
                <div class="space-y-4">
                    <h4 class="font-bold flex items-center gap-2"><i data-lucide="upload" class="w-4 h-4"></i>Cargar Comprobante</h4>
                    <div>
                        <label class="text-sm font-medium">Adjuntar Voucher de Pago (Imagen/PDF)</label>
                        <input type="file" id="pay-voucher" class="input mt-1 w-full" accept="image/*,application/pdf">
                        <p class="text-[10px] text-muted-foreground mt-1">El archivo se guardará automáticamente en Google Drive.</p>
                    </div>
                </div>
            ` : `
                <!-- Detalle de Pago Realizado -->
                <div class="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <h4 class="font-bold text-green-800 flex items-center gap-2 mb-2"><i data-lucide="check-circle" class="w-4 h-4"></i>Pago Confirmado</h4>
                    <p class="text-xs text-green-700">Este documento fue pagado el ${new Date(p.fecha_pago).toLocaleString('es-PE')}.</p>
                    ${p.voucher_url ? `<a href="${p.voucher_url}" target="_blank" class="btn btn-outline btn-sm mt-3 w-full bg-white"><i data-lucide="external-link"></i>Ver Voucher en Drive</a>` : ''}
                </div>
            `}
        </div>
    `;

    UI.modal({
        title: p.pagado == 1 ? 'Detalle de Pago' : 'Procesar Pago',
        body,
        confirmText: p.pagado == 1 ? 'Cerrar' : 'Confirmar Pago Realizado',
        hideConfirm: p.pagado == 1,
        onConfirm: async () => {
            const fileInput = document.getElementById('pay-voucher');
            if (fileInput.files.length === 0) {
                UI.toast('Debe adjuntar el voucher de pago', 'error');
                return;
            }
            
            // 1. Subir a Google Drive
            UI.toast('Subiendo voucher a Google Drive...', 'info');
            const file = fileInput.files[0];
            const driveUrl = await uploadVoucherToDrive(file, p.numero_oc);
            
            if (!driveUrl) return; // Error ya manejado en upload function

            // 2. Marcar como pagado en la base de datos
            const resp = await fetch('api/purchases.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: p.id,
                    action: 'pay',
                    voucher_url: driveUrl
                })
            });
            const res = await resp.json();
            if (res.ok) {
                UI.toast('Pago registrado con éxito', 'success');
                loadTreasuryData();
            } else {
                UI.toast('Error al registrar pago: ' + res.error, 'error');
            }
        }
    });
};

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        UI.toast('Copiado al portapapeles', 'success');
    });
};

async function uploadVoucherToDrive(file, docNumber) {
    return new Promise((resolve) => {
        google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (token) => {
                const metadata = { 
                    name: 'VOUCHER_' + docNumber + '_' + Date.now(), 
                    parents: [DRIVE_FOLDER_ID] 
                };
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                try {
                    const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + token.access_token },
                        body: form
                    });
                    const driveRes = await resp.json();
                    if (driveRes.id) {
                        resolve(driveRes.webViewLink);
                    } else {
                        UI.toast('Error al subir a Drive', 'error');
                        resolve(null);
                    }
                } catch (e) {
                    UI.toast('Error de conexión con Google Drive', 'error');
                    resolve(null);
                }
            }
        }).requestAccessToken();
    });
}
