// assets/js/auth.js — Manejo de sesión y autenticación con el backend.
window.Auth = {
  KEY: 'catolica_user',
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch { return null; }
  },
  setUser(u) { localStorage.setItem(this.KEY, JSON.stringify(u)); },
  logout() { localStorage.removeItem(this.KEY); location.hash = ''; location.reload(); },

  async login(email, password) {
    try {
      const resp = await fetch('api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await resp.json();
      
      if (!resp.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      this.setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }
};
