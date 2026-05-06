// Vista de Login (sin selector de rol – el rol lo asigna el superadmin)
window.Views = window.Views || {};
window.Views.login = function() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="login-bg min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div class="login-blob bg-primary" style="width:24rem;height:24rem;top:-6rem;left:-6rem;"></div>
      <div class="login-blob bg-secondary" style="width:24rem;height:24rem;bottom:-6rem;right:-6rem;"></div>
      <div class="login-blob bg-accent" style="width:18rem;height:18rem;top:30%;right:25%;opacity:.25;"></div>

      <div class="relative w-full max-w-md">
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <div class="relative">
              <div class="absolute inset-0 bg-brand-gradient rounded-2xl blur-md opacity-60"></div>
              <div class="relative bg-brand-gradient rounded-2xl p-4 shadow-lg">
                <i data-lucide="school" class="w-10 h-10 text-white"></i>
              </div>
            </div>
          </div>
          <h1 class="text-3xl font-bold tracking-tight">Católica <span class="text-primary">School</span></h1>
          <p class="text-muted-foreground mt-1 text-sm">Sistema de Gestión de Inventario</p>
        </div>

        <div class="card p-8 backdrop-blur-sm">
          <div class="mb-6 flex items-center gap-2">
            <div class="h-8 w-1 bg-brand-gradient rounded-full"></div>
            <div>
              <h2 class="text-2xl font-bold">Bienvenido</h2>
              <p class="text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
            </div>
          </div>

          <form id="login-form" class="space-y-5">
            <div>
              <label class="text-sm font-medium">Correo Electrónico</label>
              <div class="relative mt-1">
                <i data-lucide="mail" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></i>
                <input id="email" type="email" required placeholder="usuario@catolica.edu" class="input pl-10" />
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium">Contraseña</label>
                <button type="button" class="text-xs text-primary font-medium hover:underline">¿Olvidaste?</button>
              </div>
              <div class="relative mt-1">
                <i data-lucide="lock" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></i>
                <input id="password" type="password" required placeholder="••••••••" class="input pl-10 pr-10" />
                <button type="button" id="toggle-pw" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <i data-lucide="eye"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-full h-11">
              <span>Iniciar Sesión</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>

            <div class="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
              <i data-lucide="shield" class="w-3.5 h-3.5 text-secondary"></i>
              Acceso restringido a usuarios autorizados
            </div>
          </form>
        </div>

        <p class="text-center text-xs text-muted-foreground mt-6">© 2026 Católica School · Todos los derechos reservados</p>
      </div>
    </div>
  `;
  lucide.createIcons();

  const pw = document.getElementById('password');
  document.getElementById('toggle-pw').onclick = () => {
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = pw.value;
    try {
      await Auth.login(email, password);
      UI.toast('Sesión iniciada correctamente', 'success');
      App.boot();
    } catch (err) {
      UI.toast('Credenciales inválidas', 'error');
    }
  };
};
