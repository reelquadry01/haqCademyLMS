class APIClient {
  constructor() {
    this._sid = null;
  }

  getSessionId() {
    if (this._sid) return this._sid;
    let sid = localStorage.getItem('haq_session_id');
    if (!sid) {
      sid = 'haq-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('haq_session_id', sid);
    }
    this._sid = sid;
    return sid;
  }

  async get(url) {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async post(url, body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async put(url, body) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async del(url) {
    try {
      const res = await fetch(url, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  formatDuration(minutes) {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }
}

// Global toast function
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

window.api = new APIClient();

// Professional course thumbnails keyed by category keyword
window.getCourseThumbnail = function(category) {
  const cat = (category || '').toLowerCase();

  if (cat.includes('excel')) return {
    bg: '#0E6B35',
    svg: `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="88" rx="18" fill="#0E6B35"/>
      <line x1="24" y1="22" x2="64" y2="66" stroke="white" stroke-width="14" stroke-linecap="round"/>
      <line x1="64" y1="22" x2="24" y2="66" stroke="white" stroke-width="14" stroke-linecap="round"/>
      <rect x="12" y="12" width="64" height="64" rx="10" stroke="rgba(255,255,255,0.12)" stroke-width="2" fill="none"/>
    </svg>`
  };

  if (cat.includes('power') || cat.includes('bi') || cat.includes('intelligence')) return {
    bg: '#1C1C2E',
    svg: `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="88" rx="18" fill="#1C1C2E"/>
      <rect x="14" y="48" width="16" height="26" rx="4" fill="#F2C811"/>
      <rect x="36" y="32" width="16" height="42" rx="4" fill="#F2C811" opacity="0.85"/>
      <rect x="58" y="18" width="16" height="56" rx="4" fill="#F2C811" opacity="0.7"/>
    </svg>`
  };

  if (cat.includes('financ') || cat.includes('model')) return {
    bg: '#0A2E1A',
    svg: `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="88" rx="18" fill="#0A2E1A"/>
      <polyline points="14,68 30,46 46,54 72,22" stroke="#4ADE80" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="72" cy="22" r="6" fill="#4ADE80"/>
      <circle cx="46" cy="54" r="4" fill="#4ADE80" opacity="0.7"/>
      <circle cx="30" cy="46" r="4" fill="#4ADE80" opacity="0.7"/>
      <line x1="14" y1="74" x2="78" y2="74" stroke="rgba(74,222,128,0.25)" stroke-width="2"/>
    </svg>`
  };

  if (cat.includes('data') || cat.includes('analytic')) return {
    bg: '#0F0F2E',
    svg: `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="88" rx="18" fill="#0F0F2E"/>
      <circle cx="22" cy="62" r="6" fill="#818CF8"/>
      <circle cx="40" cy="36" r="8" fill="#818CF8" opacity="0.9"/>
      <circle cx="62" cy="50" r="5" fill="#818CF8" opacity="0.75"/>
      <circle cx="72" cy="24" r="7" fill="#818CF8"/>
      <circle cx="50" cy="68" r="4" fill="#818CF8" opacity="0.65"/>
      <line x1="22" y1="62" x2="40" y2="36" stroke="rgba(129,140,248,0.35)" stroke-width="2"/>
      <line x1="40" y1="36" x2="62" y2="50" stroke="rgba(129,140,248,0.35)" stroke-width="2"/>
      <line x1="62" y1="50" x2="72" y2="24" stroke="rgba(129,140,248,0.35)" stroke-width="2"/>
    </svg>`
  };

  // Generic fallback
  return {
    bg: '#0F3460',
    svg: `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="88" rx="18" fill="#0F3460"/>
      <rect x="18" y="28" width="52" height="8" rx="4" fill="white" opacity="0.7"/>
      <rect x="18" y="44" width="36" height="8" rx="4" fill="white" opacity="0.5"/>
      <rect x="18" y="60" width="44" height="8" rx="4" fill="white" opacity="0.35"/>
    </svg>`
  };
};
