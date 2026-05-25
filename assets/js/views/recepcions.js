// assets/js/views/recepcions.js — Recepción con Almacenamiento en la Nube (Expert Edition)
let _recepcionResources = { locs: [] };

async function loadRecepcionResources() {
    try {
        const resp = await fetch('api/locations.php').then(r => r.json());
        // Filtrar solo ubicaciones tipo 'Depósito' que estén activas
        _recepcionResources.locs = (resp.locations || []).filter(l => l.tipo === 'Depósito' && l.estado === 'activo');
    } catch(e) { console.error('Error loading recepcion resources:', e); }
}

async function loadRecepcions() {
  const tbody = document.getElementById('recepcions-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/purchases.php?approved_only=1').then(r => r.json());
    const all = data.purchases || [];
    if (all.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay órdenes aprobadas pendientes de recepción.</td></tr>';
      return;
    }
    tbody.innerHTML = all.map(p => `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${p.numero_oc}</td>
        <td>
          <div class="font-bold text-sm">${p.proveedor_nombre}</div>
          <div class="text-[10px] text-muted-foreground uppercase">${p.area_nombre || 'Sin área'}</div>
        </td>
        <td class="text-xs font-medium">${p.fecha || '—'}</td>
        <td>
            ${p.estado === 'Completada' ? `
                <div class="flex flex-col gap-1">
                    <span class="badge badge-blue w-fit">Recibido ✓</span>
                    ${p.conformidad_url ? `
                        <a href="${p.conformidad_url}" target="_blank" class="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold">
                            <i data-lucide="external-link" class="w-3 h-3"></i> Ver Acta
                        </a>
                    ` : ''}
                </div>
            ` : `
                <span class="badge badge-green w-fit flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Por Recibir
                </span>
            `}
        </td>
        <td class="text-right">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5" title="Ver Detalles de la Orden" onclick="viewOrderDetails(${p.id})">
                <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            ${(p.estado === 'Aprobada' || p.estado === 'Recibida') ? `
              <button class="btn btn-primary btn-sm" onclick="processRecepcion(${p.id}, '${p.numero_oc}')">
                <i data-lucide="package-check" class="w-4 h-4 mr-1"></i>Recibir Todo
              </button>
            ` : `
              <span class="text-xs text-muted-foreground font-medium italic">Completado</span>
            `}
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>'; }
}

window.processRecepcion = async function(id, numero_oc) {
    await loadRecepcionResources();
    UI.modal({
        title: 'Confirmar Recepción de Mercadería',
        body: `
            <div class="space-y-4">
                <div class="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p class="text-sm text-foreground">¿Confirmas que has recibido todos los ítems de la OC <strong>${numero_oc}</strong> y que están en buen estado?</p>
                </div>

                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">Almacén de Destino <span class="text-destructive">*</span></label>
                    <select id="rec-ubicacion" class="select w-full h-11">
                        ${_recepcionResources.locs.map(l => `<option value="${l.id}">${l.nombre} (${l.sede_nombre})</option>`).join('')}
                        ${_recepcionResources.locs.length === 0 ? '<option value="13">Almacén General (Default)</option>' : ''}
                    </select>
                </div>
                
                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">Sustento / Documento de Conformidad</label>
                    <div class="relative group">
                        <input type="file" id="rec-archivo" class="hidden" onchange="document.getElementById('rec-file-name').textContent = this.files[0]?.name || 'Seleccionar archivo...'">
                        <label for="rec-archivo" class="flex items-center justify-between p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <i data-lucide="file-up"></i>
                                </div>
                                <span id="rec-file-name" class="text-sm font-medium text-muted-foreground">Subir acta o guía de remisión...</span>
                            </div>
                            <span class="btn btn-ghost btn-sm">Explorar</span>
                        </label>
                    </div>
                    <p class="text-[10px] text-muted-foreground mt-2 italic">El archivo se subirá a Google Drive y solo se guardará el link en la base de datos.</p>
                </div>
            </div>
        `,
        confirmText: 'Sí, recibir todo',
        onConfirm: async () => {
            const file = document.getElementById('rec-archivo').files[0];
            
            UI.loading('Procesando recepción...');
            
            try {
                let driveLink = null;
                if (file) {
                    UI.loading(`Subiendo "${file.name}" a Google Drive...`);
                    driveLink = await uploadReceptionFileToDrive(file, `CONFORMIDAD_${numero_oc}`);
                    if (!driveLink) {
                        UI.toast('No se pudo subir el archivo a Drive. Operación cancelada.', 'error');
                        UI.stopLoading();
                        return false;
                    }
                }

                UI.loading('Actualizando inventario...');
                const res = await fetch('api/recepcions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        purchase_id: id,
                        conformidad_url: driveLink,
                        ubicacion_id: document.getElementById('rec-ubicacion')?.value || 13
                    })
                }).then(r => r.json());
                
                UI.stopLoading();
                
                if (res.ok) { 
                    const equipment = (res.received_items || []).filter(i => i.tipo === 'equipo');
                    
                    if (equipment.length > 0) {
                        UI.toast('Recepción exitosa. Link de Drive guardado. Iniciando asistente de equipos...', 'info');
                        openEquipmentOnboarding(equipment);
                    } else {
                        UI.toast('Inventario y documentos actualizados con éxito', 'success');
                    }
                    loadRecepcions();
                } else {
                    UI.toast('Error: ' + res.error, 'error');
                }
            } catch (err) {
                UI.stopLoading();
                UI.toast('Error de red: ' + (err.message || 'El servidor no respondió correctamente.'), 'error');
                console.error('Reception Error:', err);
            }
        }
    });
    lucide.createIcons();
};

// HELPER ARQUITECTURAL: Subida a Google Drive
async function uploadReceptionFileToDrive(file, name) {
    return new Promise((resolve) => {
        if (typeof google === 'undefined') { resolve(null); return; }
        
        const metadata = { 
            name: name + '_' + Date.now() + '_' + file.name, 
            parents: [DRIVE_FOLDER_ID] 
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (token) => {
                try {
                    const uploadResp = await fetch(
                        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
                        { method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token }, body: form }
                    );
                    if (uploadResp.ok) {
                        const fileData = await uploadResp.json();
                        // Permisos públicos para lectura
                        await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
                            method: 'POST',
                            headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: 'reader', type: 'anyone' })
                        });
                        resolve(fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`);
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            }
        }).requestAccessToken();
    });
}

function openEquipmentOnboarding(items) {
    let currentItemIndex = 0;
    let unitsProcessed = 0;
    
    const renderStep = () => {
        const item = items[currentItemIndex];
        const totalUnits = parseInt(item.cantidad);
        
        UI.modal({
            title: `Asistente de Registro: ${item.nombre}`,
            body: `
                <div class="space-y-4">
                    <div class="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                        <div class="text-[10px] font-bold text-primary uppercase">Artículo Recibido</div>
                        <div class="text-lg font-bold">${item.nombre}</div>
                        <div class="text-xs text-muted-foreground">Unidad ${unitsProcessed + 1} de ${totalUnits}</div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Marca / Fabricante</label>
                            <input type="text" id="ob-brand" class="input w-full h-10" placeholder="Ej: Lenovo, HP, etc.">
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Modelo / Especificación</label>
                            <input type="text" id="ob-model" class="input w-full h-10" placeholder="Ej: ThinkPad E14">
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-xs font-bold mb-1 block uppercase">Número de Serie <span class="text-destructive">*</span></label>
                            <div class="flex gap-2">
                                <input type="text" id="ob-serie" class="input flex-1 h-10 font-mono" placeholder="Ingrese o escanee serie...">
                                <button class="btn btn-outline p-2 h-10" onclick="startAssetQRScannerForOnboarding()">
                                    <i data-lucide="qr-code" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Ubicación Destino <span class="text-destructive">*</span></label>
                            <select id="ob-loc" class="select w-full h-10">
                                ${_recepcionResources.locs.map(l => `
                                    <option value="${l.id}" ${l.id == (document.getElementById('rec-ubicacion')?.value || 13) ? 'selected' : ''}>
                                        ${l.nombre} (${l.sede_nombre})
                                    </option>`).join('')}
                                ${_recepcionResources.locs.length === 0 ? '<option value="13">Almacén General</option>' : ''}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Código Patrimonial / Interno</label>
                            <input type="text" id="ob-codigo" class="input w-full h-10 bg-muted" readonly placeholder="Se generará al guardar">
                        </div>
                    </div>
                    <p class="text-[10px] text-muted-foreground italic mt-2">Nota: Al finalizar, el activo quedará en estado 'Operativo' y se generará su historial de ingreso.</p>
                </div>
            `,
            afterMount: async () => {
                // Generar código patrimonial automáticamente según categoría
                try {
                    const resp = await fetch(`api/assets.php?action=next_code&item_id=${item.item_id}`).then(r => r.json());
                    if (resp.next_code) {
                        const input = document.getElementById('ob-codigo');
                        if (input) {
                            input.value = resp.next_code;
                            input.style.opacity = '1';
                        }
                    }
                } catch(e) { console.error('Error auto-generating code:', e); }
                lucide.createIcons();
            },
            confirmText: (unitsProcessed + 1 === totalUnits && currentItemIndex + 1 === items.length) ? 'Finalizar Todo' : 'Siguiente Unidad',
            onConfirm: async () => {
                const serie = document.getElementById('ob-serie').value.trim();
                const loc_id = document.getElementById('ob-loc').value;
                if (!serie) { UI.toast('Debe ingresar el número de serie', 'error'); return false; }
                
                UI.loading('Registrando bien individual...');
                try {
                    const reg = await fetch('api/assets.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            item_id: item.item_id,
                            numero_serie: serie,
                            codigo_interno: document.getElementById('ob-codigo').value.trim() || null,
                            ubicacion_id: loc_id,
                            estado: 'Operativo',
                            marca: document.getElementById('ob-brand').value.trim(),
                            modelo: document.getElementById('ob-model').value.trim()
                        })
                    }).then(r => r.json());
                    UI.stopLoading();
                    
                    if (reg.ok) {
                        unitsProcessed++;
                        if (unitsProcessed < totalUnits) {
                            renderStep();
                        } else {
                            currentItemIndex++;
                            if (currentItemIndex < items.length) {
                                unitsProcessed = 0;
                                renderStep();
                            } else {
                                UI.toast('Todos los equipos han sido individualizados con éxito', 'success');
                            }
                        }
                    } else {
                        UI.toast('Error al registrar: ' + reg.error, 'error');
                        return false;
                    }
                } catch(e) {
                    UI.stopLoading();
                    UI.toast('Error de conexión', 'error');
                }
            }
        });
        lucide.createIcons();
    };
    
    renderStep();
}

window.startAssetQRScannerForOnboarding = function() {
    UI.modal({
        title: 'Escanear Serie / QR',
        body: `
            <div class="space-y-4">
                <div id="qr-reader-ob" class="overflow-hidden rounded-xl bg-slate-900 aspect-square flex items-center justify-center text-white text-xs italic">
                    Iniciando cámara...
                </div>
                <p class="text-[10px] text-muted-foreground text-center italic">Encuadre el código de serie o QR del activo.</p>
            </div>
        `,
        confirmText: 'Detener Cámara',
        onConfirm: () => {
            if (window._qrScannerOb) window._qrScannerOb.stop().catch(e => console.error(e));
            return true;
        }
    });

    setTimeout(() => {
        const html5QrCode = new Html5Qrcode("qr-reader-ob");
        window._qrScannerOb = html5QrCode;
        html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 15, qrbox: { width: 250, height: 250 } }, 
            (decodedText) => {
                const finalCode = decodedText.split('/').pop();
                const input = document.getElementById('ob-serie');
                if (input) input.value = finalCode;
                UI.toast(`Serie detectada: ${finalCode}`, 'success');
                html5QrCode.stop().then(() => {
                    const closeBtn = document.querySelector('.modal-container button');
                    if (closeBtn) closeBtn.click();
                }).catch(err => console.error(err));
            },
            () => {}
        ).catch(err => {
            const container = document.getElementById('qr-reader-ob');
            if (container) container.innerHTML = `<div class="p-6 text-center text-destructive font-medium">Error: ${err}</div>`;
        });
    }, 500);
};

window.Views.recepcions = function() {
  return `
    ${UI.pageHeader('Recepción de Almacén', 'Control de ingreso de mercadería y equipos')}
    <div class="card">
      <div class="table-container">
        <table class="data">
          <thead>
            <tr><th>N° OC/OS</th><th>Proveedor / Área</th><th>Fecha</th><th>Estado</th><th class="text-right">Acciones</th></tr>
          </thead>
          <tbody id="recepcions-table-body">
            <tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
};

window.Views.recepcions.afterMount = loadRecepcions;
