window.Views = window.Views || {};
window.Views.settings = function() {
  return `
    ${UI.pageHeader('Configuración','Ajustes generales del sistema')}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-6">
        <h3 class="font-semibold mb-4">Institución</h3>
        <div class="space-y-3">
          <div><label class="text-sm font-medium">Nombre</label><input class="input mt-1" value="Católica School"></div>
          <div><label class="text-sm font-medium">RUC</label><input class="input mt-1" value="20512345678"></div>
          <div><label class="text-sm font-medium">Dirección</label><input class="input mt-1" value="Av. Principal 123"></div>
        </div>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold mb-4">Preferencias</h3>
        <div class="space-y-3 text-sm">
          ${[['Notificaciones por correo',true],['Alertas de stock bajo',true],['Modo compacto',false],['Mostrar ayudas',true]].map(([l,v])=>`
            <label class="flex items-center justify-between p-2 rounded-md hover:bg-muted">
              <span>${l}</span>
              <input type="checkbox" class="w-4 h-4 accent-primary" ${v?'checked':''} />
            </label>`).join('')}
        </div>
        <button class="btn btn-primary mt-4"><i data-lucide="save"></i>Guardar cambios</button>
      </div>
    </div>`;
};
