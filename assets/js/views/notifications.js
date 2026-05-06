window.Views = window.Views || {};

window.Views.notifications = function() {
  return `
    ${UI.pageHeader('Notificaciones','Alertas de stock, mantenimientos y aprobaciones',`
      <button class="btn btn-outline" onclick="markAllAsRead()"><i data-lucide="check-check"></i>Marcar todo como leído</button>
    `)}
    <div id="notifications-list" class="card divide-y divide-border">
      <div class="p-10 text-center text-muted-foreground">Cargando notificaciones...</div>
    </div>`;
};

window.Views.notifications.afterMount = async function() {
    const user = Auth.getUser();
    if (!user) return;
    loadNotifications(user.id);
};

async function loadNotifications(userId) {
    const el = document.getElementById('notifications-list');
    if (!el) return;
    
    try {
        const resp = await fetch(`api/notifications.php?usuario_id=${userId}`).then(r => r.json());
        const list = resp.notifications || [];
        
        if (list.length === 0) {
            el.innerHTML = '<div class="p-10 text-center text-muted-foreground">No tienes notificaciones pendientes.</div>';
            return;
        }

        const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'bell' };
        const tints = { success: 'badge-green', error: 'badge-red', warning: 'badge-yellow', info: 'badge-blue' };

        el.innerHTML = list.map(n => `
            <div class="p-4 flex items-start gap-3 hover:bg-muted/50 ${n.leido == 0 ? 'bg-primary/5 border-l-4 border-primary' : ''}">
                <div class="badge ${tints[n.tipo] || 'badge-gray'} w-9 h-9 rounded-lg !p-0 flex items-center justify-center shrink-0">
                    <i data-lucide="${icons[n.tipo] || 'bell'}"></i>
                </div>
                <div class="flex-1">
                    <div class="font-bold text-sm">${n.titulo}</div>
                    <div class="text-sm text-muted-foreground mt-1">${n.mensaje}</div>
                    <div class="text-[10px] text-muted-foreground mt-2">${new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div class="flex gap-1">
                    ${n.leido == 0 ? `<button class="btn btn-ghost p-1.5 text-primary" onclick="markAsRead(${n.id})" title="Marcar como leído"><i data-lucide="check" class="w-4 h-4"></i></button>` : ''}
                    <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteNotification(${n.id})" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    } catch {
        el.innerHTML = '<div class="p-10 text-center text-destructive">Error al cargar notificaciones.</div>';
    }
}

window.markAsRead = async function(id) {
    await fetch('api/notifications.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    const user = Auth.getUser();
    loadNotifications(user.id);
};

window.markAllAsRead = async function() {
    const user = Auth.getUser();
    await fetch(`api/notifications.php?usuario_id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
    });
    loadNotifications(user.id);
};

window.deleteNotification = async function(id) {
    await fetch(`api/notifications.php?id=${id}`, { method: 'DELETE' });
    const user = Auth.getUser();
    loadNotifications(user.id);
};
