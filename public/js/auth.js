/**
 * Authentication — Login, Logout, Session check
 */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path === '/' || path === '/index.html') {
    checkIfAlreadyLoggedIn();
    setupLoginForm();
    setupPasswordToggle();
  } else if (path.includes('dashboard')) {
    checkAuth();
    setupLogout();
  }
});

// ─── Check if already logged in (on login page) ──
async function checkIfAlreadyLoggedIn() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.authenticated) {
      window.location.href = '/dashboard';
    }
  } catch (err) {
    // Not logged in — stay on login page
  }
}

// ─── Check auth on protected pages ───────────────
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/';
      return;
    }
    const adminEl = document.getElementById('adminUsername');
    if (adminEl && data.admin) {
      adminEl.textContent = data.admin.username;
    }
  } catch (err) {
    window.location.href = '/';
  }
}

// ─── Login form handler ──────────────────────────
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const btnText = document.getElementById('loginBtnText');
    const errorEl = document.getElementById('loginError');

    // Hide previous error
    errorEl.classList.add('d-none');
    errorEl.textContent = '';

    // Validate
    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password.';
      errorEl.classList.remove('d-none');
      return;
    }

    // Show loading
    loginBtn.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Signing in...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        const msg = data.error || (data.errors && data.errors[0].msg) || 'Login failed';
        errorEl.textContent = msg;
        errorEl.classList.remove('d-none');
      }
    } catch (err) {
      errorEl.textContent = 'Network error. Please try again.';
      errorEl.classList.remove('d-none');
    } finally {
      loginBtn.disabled = false;
      spinner.classList.add('d-none');
      btnText.textContent = 'Sign In';
    }
  });
}

// ─── Logout ──────────────────────────────────────
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // ignore
    }
    window.location.href = '/';
  });
}

// ─── Toggle password visibility ──────────────────
function setupPasswordToggle() {
  const toggleBtn = document.getElementById('togglePassword');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const icon = toggleBtn.querySelector('i');

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
  });
}
