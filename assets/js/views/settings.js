window.Views = window.Views || {};
window.Views.settings = function() {
  return `
    ${UI.pageHeader('Configuración','Ajustes generales del sistema')}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-6">
        <h3 class="font-semibold mb-4 text-primary flex items-center gap-2"><i data-lucide="building"></i> Institución</h3>
        <div class="space-y-3">
          <div><label class="text-sm font-medium text-muted-foreground">Nombre</label><input class="input mt-1" value="Católica School"></div>
          <div><label class="text-sm font-medium text-muted-foreground">RUC</label><input class="input mt-1" value="20512345678"></div>
          <div><label class="text-sm font-medium text-muted-foreground">Dirección</label><input class="input mt-1" value="Av. Principal 123"></div>
        </div>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold mb-4 text-primary flex items-center gap-2"><i data-lucide="bell"></i> Preferencias</h3>
        <div class="space-y-3 text-sm">
          ${[['Notificaciones por correo',true],['Alertas de stock bajo',true],['Modo compacto',false],['Mostrar ayudas',true]].map(([l,v])=>`
            <label class="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
              <span class="font-medium">${l}</span>
              <input type="checkbox" class="w-4 h-4 accent-primary" ${v?'checked':''} />
            </label>`).join('')}
        </div>
        <button class="btn btn-primary mt-6 w-full"><i data-lucide="save"></i>Guardar cambios</button>
      </div>

      <!-- ZONA DE PELIGRO - Solo para Administradores -->
      <div class="card p-6 border-red-100 bg-red-50/20 lg:col-span-2 mt-4">
        <div class="flex items-center gap-2 mb-4 text-red-600">
            <i data-lucide="shield-alert" class="w-5 h-5"></i>
            <h3 class="font-bold">Zona de Peligro (Solo Administrador)</h3>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-white border border-red-200">
            <div>
                <p class="font-bold text-sm">Reiniciar Inventario</p>
                <p class="text-xs text-muted-foreground mt-1">Elimina todos los artículos, movimientos, activos e historial de compras del almacén. Esta acción no se puede deshacer.</p>
            </div>
            <button class="btn btn-outline border-red-500 text-red-600 hover:bg-red-500 hover:text-white" onclick="systemResetInventory()">
                <i data-lucide="trash-2"></i> Reiniciar Inventario
            </button>
        </div>
      </div>
    </div>`;
};

window.systemResetInventory = function() {
    UI.modal({
        title: '¡ADVERTENCIA CRÍTICA!',
        body: `
            <div class="flex flex-col items-center text-center p-2">
                <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <i data-lucide="alert-triangle" class="w-10 h-10"></i>
                </div>
                <p class="font-bold text-red-700 text-lg">¿Estás absolutamente seguro?</p>
                <p class="text-sm mt-2 text-muted-foreground">Esta acción borrará permanentemente <strong>TODOS</strong> los datos del almacén (ítems, movimientos y activos). No habrá forma de recuperarlos.</p>
                <div class="mt-4 p-3 bg-red-50 rounded border border-red-200 text-xs text-red-800">
                    Escriba <strong>ELIMINAR TODO</strong> para confirmar:
                    <input id="confirm-reset-text" type="text" class="input mt-2 w-full text-center font-bold" placeholder="Escriba aquí...">
                </div>
            </div>`,
        confirmText: 'SÍ, BORRAR TODO EL INVENTARIO',
        onConfirm: async () => {
            const input = document.getElementById('confirm-reset-text').value;
            if (input !== 'ELIMINAR TODO') {
                UI.toast('Confirmación incorrecta', 'error');
                return;
            }

            UI.loading('Limpiando base de datos...');
            try {
                const resp = await fetch('api/system.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reset_inventory' })
                });
                const res = await resp.json();
                UI.stopLoading();
                if (res.ok) {
                    UI.toast('Inventario reiniciado con éxito', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    UI.toast('Error: ' + res.error, 'error');
                }
            } catch (err) {
                UI.stopLoading();
                UI.toast('Error de conexión', 'error');
            }
        }
    });
};
