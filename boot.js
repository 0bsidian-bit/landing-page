// Runs before first paint: re-applies the last photo, tone and accent so the page
// doesn't flash the default colours while app.js loads.
(() => {
  const root = document.documentElement;
  const read = key => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

  const scene = read('0bsidian_scene');
  if (typeof scene === 'string' && /^[a-z]+$/.test(scene)) root.dataset.scene = scene;

  const prefs = read('0bsidian_wallpaper_v1');
  if (prefs && prefs.source === 'scene') return;

  const look = read('0bsidian_look_v1');
  if (!look || typeof look.wall !== 'string' || !look.wall.startsWith('/api/wallpaper/image?')) return;
  if (!isHex(look.accent) || !isHex(look.ink) || !isHex(look.bg)) return;
  if (/["\\)]/.test(look.wall)) return;

  root.dataset.tone = look.tone === 'light' ? 'light' : 'dark';
  root.dataset.wall = 'on';
  root.style.setProperty('--wall', `url("${look.wall}")`);
  root.style.setProperty('--accent', look.accent);
  root.style.setProperty('--accent-ink', look.ink);
  root.style.setProperty('--bg', look.bg);
  if (Number.isFinite(look.dim)) root.style.setProperty('--dim', (look.dim / 100).toFixed(2));
})();
