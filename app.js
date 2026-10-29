/**
 * 0bsidian — a pomodoro timer set on the picture of the day.
 * During a focus session the picture stays grey and soft (unobserved) and resolves
 * into colour as time passes; finishing the session reveals all of it.
 */

const ICONS = {
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="5,2 21,12 5,22"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="6" height="20"/><rect x="14" y="2" width="6" height="20"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/></svg>`
};

// On time, observation and not knowing; a new one each time a session starts
const QUOTES = [
  ['The distinction between past, present and future is only a stubbornly persistent illusion.', 'Albert Einstein'],
  ['The beginning is the end, and the end is the beginning.', 'Dark'],
  ['What we know is a drop. What we don’t know is an ocean.', 'Dark, after Isaac Newton'],
  ['The question isn’t where, but when.', 'Dark'],
  ['I think I can safely say that nobody understands quantum mechanics.', 'Richard Feynman'],
  ['What we observe is not nature itself, but nature exposed to our method of questioning.', 'Werner Heisenberg'],
  ['The eternal mystery of the world is its comprehensibility.', 'Albert Einstein'],
  ['Time is what keeps everything from happening at once.', 'Ray Cummings'],
  ['Everything is connected.', 'Dark'],
  ['Imagination is more important than knowledge.', 'Albert Einstein'],
  ['Nothing in life is to be feared, it is only to be understood.', 'Marie Curie'],
  ['Look up at the stars and not down at your feet.', 'Stephen Hawking']
];

const SETTINGS_KEY = '0bsidian_settings_v2';
const TIMER_KEY = '0bsidian_timer_v2';
const HISTORY_KEY = '0bsidian_history_v2';
const TASKS_KEY = '0bsidian_tasks_v3';
const SOUND_KEY = '0bsidian_sound_v1';
const SCENE_KEY = '0bsidian_scene';
const WALL_KEY = '0bsidian_wallpaper_v1';
const WALL_STATS_KEY = '0bsidian_wall_stats_v1';
const LOOK_KEY = '0bsidian_look_v1'; // last picture's look, applied by boot.js before first paint
const HOME_KEY = '0bsidian_home_v1';
// Data from the previous version of the site
const LEGACY_KEYS = [
  'lt-ai-history', 'lt-chat-threads', '0bsidian_pet_id', '0bsidian_pomo_state_v1', '0bsidian_pomo_stats',
  '0bsidian_pomo_names_v1', '0bsidian_pomo_settings_v1', '0bsidian_pomo_log_v1', '0bsidian_sound_enabled',
  '0bsidian_timer_mode', '0bsidian_break_tags_v1', '0bsidian_todos_v2'
];

const DARK_PHOTO_LUM = 0.09; // mean relative luminance below this counts as a dark picture
const LIGHT_UI_LUM = 0.28;   // above this, after dimming, the page switches to dark text
const DEVELOP_FADE_MS = 2100; // matches the opacity transition on the sharp print

const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longEvery: 4,
  autoBreak: false,
  autoFocus: false,
  goal: 240,
  bell: true,
  tick: false,
  notify: false
};

const MODES = {
  pomodoro:   { label: 'focus',       setting: 'focus' },
  shortBreak: { label: 'short break', setting: 'shortBreak' },
  longBreak:  { label: 'long break',  setting: 'longBreak' }
};

const Store = {
  get(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
};

function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...Store.get(SETTINGS_KEY, {}) };
}

function siteConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmOverlay');
    const msg = document.getElementById('confirmMsg');
    const yesBtn = document.getElementById('confirmYes');
    const cancelBtn = document.getElementById('confirmCancel');
    if (!overlay || !msg) { resolve(confirm(message)); return; }

    msg.textContent = message;
    overlay.inert = false;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => yesBtn.focus(), 50);

    const cleanup = (result) => {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.inert = true;
      yesBtn.removeEventListener('click', onYes);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };

    const onYes = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cleanup(false); }
      if (e.key === 'Enter') { e.preventDefault(); cleanup(true); }
    };

    yesBtn.addEventListener('click', onYes);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey, true);
  });
}

class DOMUtils {
  // Renders "25:00" with the colon in its own span
  static setDigits(el, text) {
    if (!el) return;
    const doc = el.ownerDocument;
    const nodes = [];
    text.split(':').forEach((part, i) => {
      if (i) {
        const colon = doc.createElement('span');
        colon.className = 'colon';
        colon.textContent = ':';
        nodes.push(colon);
      }
      nodes.push(doc.createTextNode(part));
    });
    el.replaceChildren(...nodes);
    el.classList.toggle('is-long', text.length > 5);
  }

  static fmtMinutes(mins) {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  static fmtClockTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

class Quotes {
  static index = Math.floor(Math.random() * QUOTES.length);

  static show() {
    const [text, by] = QUOTES[this.index];
    const textEl = document.getElementById('quoteText');
    const byEl = document.getElementById('quoteBy');
    if (textEl) textEl.textContent = text;
    if (byEl) byEl.textContent = by;
  }

  static next() {
    this.index = (this.index + 1) % QUOTES.length;
    this.show();
  }
}

// ── Audio ────────────────────────────────────────────────────────────────────

// One AudioContext for the bell and the focus sounds. Browsers only let it start
// after the visitor has interacted with the page.
const AudioHub = {
  ctx: null,
  get() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
};

const Chime = {
  // A soft three-note arpeggio
  bell() {
    const ctx = AudioHub.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [[659.25, 0], [987.77, 0.18], [1318.51, 0.36]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.22, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 2.3);
    });
  },

  tick() {
    const ctx = AudioHub.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.012);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  }
};

const SOUNDS = {
  off:   { label: 'Silence',     note: 'nothing but the bell' },
  rain:  { label: 'Rain',        note: 'steady, soft' },
  waves: { label: 'Waves',       note: 'a slow swell' },
  fan:   { label: 'Fan',         note: 'a low hum' },
  brown: { label: 'Brown noise', note: 'deep' },
  pink:  { label: 'Pink noise',  note: 'even' }
};

// Focus sounds, synthesised from noise so there is nothing to download
class Ambience {
  constructor(app) {
    this.app = app;
    const saved = Store.get(SOUND_KEY, {});
    this.type = SOUNDS[saved.type] ? saved.type : 'off';
    this.volume = Number.isFinite(saved.volume) ? saved.volume : 50;
    this.focusOnly = !!saved.focusOnly;
    this.buffers = {};
    this.graph = null;
    this.previewTimer = null;

    this.list = document.getElementById('soundList');
    this.volumeEl = document.getElementById('soundVolume');
    this.volumeVal = document.getElementById('soundVolumeVal');
    this.focusOnlyEl = document.getElementById('soundFocusOnly');
    this.navBtn = document.getElementById('soundsBtn');

    Object.entries(SOUNDS).forEach(([id, sound]) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'sound-option';
      btn.dataset.sound = id;
      const name = document.createElement('span');
      name.className = 'sound-name';
      name.textContent = sound.label;
      const note = document.createElement('span');
      note.className = 'sound-note';
      note.textContent = sound.note;
      btn.append(name, note);
      btn.addEventListener('click', () => this.select(id));
      li.appendChild(btn);
      this.list?.appendChild(li);
    });

    this.volumeEl?.addEventListener('input', () => this.setVolume(parseInt(this.volumeEl.value, 10)));
    this.focusOnlyEl?.addEventListener('change', () => {
      this.focusOnly = this.focusOnlyEl.checked;
      this.save();
      this.sync();
    });
    this.syncUI();
  }

  save() {
    Store.set(SOUND_KEY, { type: this.type, volume: this.volume, focusOnly: this.focusOnly });
  }

  select(type) {
    this.type = type;
    this.save();
    clearTimeout(this.previewTimer);
    if (type === 'off') {
      this.stop();
    } else {
      this.play();
      // With "only while focusing" on, a pick outside a session is a short preview
      if (!this.shouldPlay()) this.previewTimer = setTimeout(() => this.sync(), 4000);
    }
    this.syncUI();
  }

  shouldPlay() {
    return this.type !== 'off' && (!this.focusOnly || this.app.timer?.isFocusRunning());
  }

  // Follow the timer: called whenever it starts, pauses or changes phase
  sync() {
    const want = this.shouldPlay();
    if (want && !this.graph && AudioHub.ctx) this.play();
    else if (!want && this.graph) this.stop();
  }

  level() {
    return Math.pow(this.volume / 100, 2) * 0.9;
  }

  setVolume(v) {
    this.volume = v;
    this.save();
    if (this.graph) this.graph.out.gain.setTargetAtTime(this.level(), AudioHub.ctx.currentTime, 0.1);
    this.syncUI();
  }

  buffer(color) {
    if (this.buffers[color]) return this.buffers[color];
    const ctx = AudioHub.ctx;
    const length = ctx.sampleRate * 6;
    const buf = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        if (color === 'pink') {
          // Paul Kellet's pink noise filter
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else {
          last = (last + 0.02 * white) / 1.02;
          d[i] = last * 3.5;
        }
      }
      // Pull the ends together so the loop has no click
      const drift = d[length - 1] - d[0];
      for (let i = 0; i < length; i++) d[i] -= drift * (i / (length - 1));
    }
    this.buffers[color] = buf;
    return buf;
  }

  play() {
    const ctx = AudioHub.get();
    if (!ctx) return;
    this.stop(true);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const nodes = [];
    const source = (color) => {
      const src = ctx.createBufferSource();
      src.buffer = this.buffer(color);
      src.loop = true;
      src.start();
      nodes.push(src);
      return src;
    };
    const filter = (type, freq, q) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      return f;
    };
    const gain = (v) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };

    switch (this.type) {
      case 'rain':
        source('pink').connect(filter('highpass', 400)).connect(filter('lowpass', 8000)).connect(gain(0.9)).connect(out);
        break;
      case 'waves': {
        const swell = gain(0.5);
        const lowpass = filter('lowpass', 600);
        source('brown').connect(lowpass).connect(swell).connect(out);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.085;
        lfo.connect(gain(0.42)).connect(swell.gain);
        lfo.connect(gain(350)).connect(lowpass.frequency);
        lfo.start();
        nodes.push(lfo);
        break;
      }
      case 'fan':
        source('brown').connect(filter('lowpass', 380)).connect(gain(1)).connect(out);
        source('pink').connect(filter('bandpass', 900, 0.6)).connect(gain(0.08)).connect(out);
        break;
      case 'brown':
        source('brown').connect(gain(0.9)).connect(out);
        break;
      case 'pink':
        source('pink').connect(gain(0.4)).connect(out);
        break;
      default:
        out.disconnect();
        return;
    }
    out.gain.setTargetAtTime(this.level(), ctx.currentTime, 0.6);
    this.graph = { out, nodes };
    this.syncUI();
  }

  stop(immediate = false) {
    if (!this.graph) return;
    const { out, nodes } = this.graph;
    this.graph = null;
    const t = AudioHub.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(0, t, immediate ? 0.03 : 0.3);
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop(); } catch {} });
      out.disconnect();
    }, immediate ? 150 : 1500);
    this.syncUI();
  }

  syncUI() {
    this.list?.querySelectorAll('.sound-option').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.sound === this.type));
    });
    if (this.volumeEl) this.volumeEl.value = this.volume;
    if (this.volumeVal) this.volumeVal.textContent = this.volume;
    if (this.focusOnlyEl) this.focusOnlyEl.checked = this.focusOnly;
    if (this.navBtn) this.navBtn.textContent = this.graph ? `sounds · ${SOUNDS[this.type].label.toLowerCase()}` : 'sounds';
  }
}

// ── Timer ────────────────────────────────────────────────────────────────────

class Timer {
  constructor(app) {
    this.app = app;
    this.settings = loadSettings();
    const saved = Store.get(TIMER_KEY, {});
    this.mode = MODES[saved.mode] ? saved.mode : 'pomodoro';
    this.cycles = Number.isInteger(saved.cycles) ? saved.cycles : 0; // focus sessions since the last long break
    this.running = false;
    this.endsAt = null;
    this.intervalId = null;
    this.timeLeft = this.length(this.mode);
    this.baseTitle = document.title;
    this.lastDevelop = null;
    this.developTimer = null;

    this.el = {
      root: document.documentElement,
      app: document.getElementById('app'),
      timer: document.querySelector('.timer'),
      modes: document.querySelectorAll('.mode'),
      digits: document.getElementById('timerDigits'),
      phaseName: document.getElementById('phaseName'),
      cycleText: document.getElementById('cycleText'),
      phaseTask: document.getElementById('phaseTask'),
      startBtn: document.getElementById('startBtn'),
      startIcon: document.getElementById('startIcon'),
      startLabel: document.getElementById('startLabel'),
      resetBtn: document.getElementById('resetBtn'),
      skipBtn: document.getElementById('skipBtn'),
      progress: document.getElementById('progressFill'),
      viewTimer: document.getElementById('viewTimer'),
      notifyHint: document.getElementById('notifyHint')
    };

    this.bindControls();
    this.bindSettings();
    this.restore(saved);
    this.render();
  }

  length(mode) {
    return this.settings[MODES[mode].setting] * 60;
  }

  isFocusRunning() {
    return this.running && this.mode === 'pomodoro';
  }

  save() {
    Store.set(TIMER_KEY, {
      mode: this.mode,
      timeLeft: this.timeLeft,
      endsAt: this.running ? this.endsAt : null,
      running: this.running,
      cycles: this.cycles
    });
  }

  restore(saved) {
    if (saved.running && typeof saved.endsAt === 'number') {
      const left = Math.ceil((saved.endsAt - Date.now()) / 1000);
      if (left > 0) {
        this.timeLeft = left;
        this.endsAt = saved.endsAt;
        this.running = true;
        this.intervalId = setInterval(() => this.tick(), 1000);
      } else {
        // Finished while the page was closed: log it at the time it ended
        this.timeLeft = 0;
        this.complete({ restored: true, at: saved.endsAt });
      }
    } else if (typeof saved.timeLeft === 'number' && saved.timeLeft > 0 && saved.timeLeft <= this.length(this.mode)) {
      this.timeLeft = saved.timeLeft;
    }
  }

  bindControls() {
    this.el.startBtn?.addEventListener('click', () => this.toggle());
    this.el.skipBtn?.addEventListener('click', () => this.skip());
    this.el.resetBtn?.addEventListener('click', () => this.confirmReset());

    this.el.modes.forEach(btn => {
      btn.addEventListener('click', async () => {
        const mode = btn.dataset.mode;
        if (mode === this.mode) return;
        if (this.running && !(await siteConfirm(`Switch to ${MODES[mode].label}? This stops the current timer.`))) return;
        this.setMode(mode);
      });
    });
  }

  bindSettings() {
    document.querySelectorAll('[data-setting]').forEach(input => {
      const key = input.dataset.setting;
      const isCheckbox = input.type === 'checkbox';
      input.addEventListener(isCheckbox ? 'change' : 'input', () => {
        this.set(key, isCheckbox ? input.checked : parseInt(input.value, 10));
      });
    });

    const notifyEl = document.getElementById('setNotify');
    notifyEl?.addEventListener('change', async () => {
      if (notifyEl.checked) {
        if (!('Notification' in window)) {
          notifyEl.checked = false;
          this.setNotifyHint('This browser can\'t show notifications.');
          return;
        }
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          notifyEl.checked = false;
          this.setNotifyHint('Notifications are blocked for this site. Allow them in your browser\'s site settings, then turn this on again.');
          return;
        }
      }
      this.set('notify', notifyEl.checked);
    });

    this.syncSettingsUI();
  }

  setNotifyHint(text) {
    if (this.el.notifyHint) this.el.notifyHint.textContent = text;
  }

  syncSettingsUI() {
    document.querySelectorAll('[data-setting]').forEach(input => {
      const value = this.settings[input.dataset.setting];
      if (input.type === 'checkbox') input.checked = !!value;
      else input.value = value;
    });
    document.querySelectorAll('[data-value]').forEach(el => {
      const key = el.dataset.value;
      el.textContent = key === 'goal' ? DOMUtils.fmtMinutes(this.settings.goal) : this.settings[key];
    });
    const notifyEl = document.getElementById('setNotify');
    if (notifyEl) notifyEl.checked = this.settings.notify && 'Notification' in window && Notification.permission === 'granted';
  }

  set(key, value) {
    this.settings[key] = value;
    Store.set(SETTINGS_KEY, this.settings);
    if (MODES[this.mode].setting === key && !this.running) this.timeLeft = this.length(this.mode);
    this.syncSettingsUI();
    this.render();
    if (key === 'goal') History.render();
    this.app.tasks?.renderSummary();
  }

  toggle() {
    this.running ? this.pause() : this.start();
  }

  start({ auto = false } = {}) {
    if (this.running) return;
    if (!auto) AudioHub.get();
    if (this.timeLeft <= 0) this.timeLeft = this.length(this.mode);
    if (this.timeLeft === this.length(this.mode)) Quotes.next();
    this.running = true;
    this.endsAt = Date.now() + this.timeLeft * 1000;
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.save();
    this.render();
  }

  pause() {
    if (!this.running) return;
    this.timeLeft = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    this.running = false;
    this.endsAt = null;
    clearInterval(this.intervalId);
    this.save();
    this.render();
  }

  async confirmReset() {
    const started = this.running || this.timeLeft < this.length(this.mode);
    if (!started) return;
    if (this.mode === 'pomodoro' && !(await siteConfirm('Reset this focus session? It won\'t be logged.'))) return;
    this.reset();
  }

  reset() {
    this.running = false;
    this.endsAt = null;
    clearInterval(this.intervalId);
    this.timeLeft = this.length(this.mode);
    this.save();
    this.render();
  }

  setMode(mode, { autoStart = false } = {}) {
    if (!MODES[mode]) return;
    if (this.mode === 'longBreak' && mode === 'pomodoro') this.cycles = 0;
    clearInterval(this.intervalId);
    this.running = false;
    this.endsAt = null;
    this.mode = mode;
    this.timeLeft = this.length(mode);
    this.save();
    this.render();
    if (autoStart) this.start({ auto: true });
  }

  // Move on without logging the current phase
  skip() {
    const wasRunning = this.running;
    this.setMode(this.mode === 'pomodoro' ? 'shortBreak' : 'pomodoro', { autoStart: wasRunning });
  }

  tick() {
    this.timeLeft = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    if (this.mode === 'pomodoro' && this.settings.tick && !document.hidden) Chime.tick();
    if (this.timeLeft <= 0) {
      this.complete();
      return;
    }
    this.renderTime();
    if (this.timeLeft % 5 === 0) this.save();
  }

  // restored: the phase ended while the page was closed, so no bell, notification or auto-start
  complete({ restored = false, at = Date.now() } = {}) {
    clearInterval(this.intervalId);
    this.running = false;
    this.endsAt = null;
    if (!restored && this.settings.bell) Chime.bell();

    if (this.mode === 'pomodoro') {
      this.cycles++;
      const task = this.app.tasks?.creditActive();
      History.add({ type: 'focus', name: task || 'focus', minutes: this.settings.focus, at });
      const long = this.cycles >= this.settings.longEvery;
      const next = long ? `${this.settings.longBreak}-minute long break` : `${this.settings.shortBreak}-minute break`;
      if (!restored) {
        this.app.toast('Observed.', `${this.settings.focus} minutes${task ? ` on ${task}` : ' of focus'}. Time for a ${next}.`);
        this.app.notify('Focus session done', `Time for a ${next}.`);
      }
      this.setMode(long ? 'longBreak' : 'shortBreak', { autoStart: !restored && this.settings.autoBreak });
    } else {
      const long = this.mode === 'longBreak';
      History.add({
        type: 'break',
        kind: long ? 'long' : 'short',
        name: MODES[this.mode].label,
        minutes: this.settings[MODES[this.mode].setting],
        at
      });
      if (!restored) {
        this.app.toast('Back to the present.', this.settings.autoFocus ? 'The next focus session has started.' : 'The next focus session is ready when you are.');
        this.app.notify('Break over', 'Ready for the next focus session?');
      }
      this.setMode('pomodoro', { autoStart: !restored && this.settings.autoFocus });
    }
  }

  clockText() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  startLabel() {
    if (this.running) return 'pause';
    return this.timeLeft < this.length(this.mode) ? 'resume' : 'start';
  }

  phaseLabel() {
    if (this.mode !== 'pomodoro') return MODES[this.mode].label;
    return this.app.tasks?.activeText() || 'focus';
  }

  cycleLabel() {
    const every = this.settings.longEvery;
    if (this.mode === 'pomodoro') return `session ${Math.min(this.cycles + 1, every)} of ${every}`;
    if (this.mode === 'longBreak') return `${every} of ${every} done`;
    return `${Math.min(this.cycles, every)} of ${every} done`;
  }

  // The picture resolves from grey to colour over a focus session, in 1% steps
  updateDevelop() {
    const root = this.el.root;
    const enabled = this.app.wallpaper?.prefs.develop !== false;
    const inSession = this.mode === 'pomodoro' && (this.running || this.timeLeft < this.length(this.mode));
    if (!enabled || !inSession) {
      if (this.lastDevelop !== 1) {
        this.lastDevelop = 1;
        root.style.setProperty('--develop', '1');
        // Keep the soft print underneath until the sharp one has faded back in
        clearTimeout(this.developTimer);
        this.developTimer = setTimeout(() => root.removeAttribute('data-developing'), DEVELOP_FADE_MS);
      }
      return;
    }
    clearTimeout(this.developTimer);
    root.setAttribute('data-developing', '');
    const step = Math.floor((1 - this.timeLeft / this.length(this.mode)) * 100) / 100;
    if (step !== this.lastDevelop) {
      this.lastDevelop = step;
      root.style.setProperty('--develop', step.toFixed(2));
    }
  }

  renderTime() {
    const text = this.clockText();
    DOMUtils.setDigits(this.el.digits, text);
    const elapsed = Math.max(0, 1 - this.timeLeft / this.length(this.mode));
    if (this.el.progress) this.el.progress.style.width = `${(elapsed * 100).toFixed(2)}%`;
    document.title = this.running ? `(${text}) 0bsidian` : this.baseTitle;
    if (this.el.viewTimer) {
      this.el.viewTimer.hidden = !this.running;
      this.el.viewTimer.textContent = this.running ? text : '';
    }
    this.updateDevelop();
    this.app.tabIcon?.render(this);
    this.app.popout?.render();
  }

  render() {
    const rest = this.mode !== 'pomodoro';
    this.el.root.dataset.phase = rest ? 'rest' : 'focus';
    this.el.timer?.classList.toggle('is-rest', rest);
    this.el.timer?.classList.toggle('is-running', this.running);
    this.el.app?.classList.toggle('is-running', this.running);

    this.el.modes.forEach(btn => btn.setAttribute('aria-selected', String(btn.dataset.mode === this.mode)));
    if (this.el.phaseName) this.el.phaseName.textContent = MODES[this.mode].label;
    if (this.el.cycleText) this.el.cycleText.textContent = this.cycleLabel();

    const task = this.app.tasks?.activeText();
    if (this.el.phaseTask) {
      this.el.phaseTask.textContent = task || 'pick a task';
      this.el.phaseTask.classList.toggle('is-empty', !task);
    }

    const label = this.startLabel();
    if (this.el.startIcon) this.el.startIcon.innerHTML = this.running ? ICONS.pause : ICONS.play;
    if (this.el.startLabel) this.el.startLabel.textContent = label;
    if (this.el.startBtn) this.el.startBtn.title = `${label[0].toUpperCase()}${label.slice(1)} (Space)`;

    this.renderTime();
    this.app.onTimerChange?.();
  }
}

// ── Tasks ────────────────────────────────────────────────────────────────────

class Tasks {
  constructor(app) {
    this.app = app;
    const saved = Store.get(TASKS_KEY, {});
    this.items = Array.isArray(saved.items) ? saved.items.filter(t => t && typeof t.text === 'string') : [];
    this.activeId = saved.activeId ?? null;
    this.est = 1;

    this.form = document.getElementById('taskForm');
    this.input = document.getElementById('taskInput');
    this.estVal = document.getElementById('taskEst');
    this.list = document.getElementById('taskList');
    this.summary = document.getElementById('taskSummary');
    this.clearBtn = document.getElementById('clearFinishedBtn');

    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (!text) return;
      this.add(text, this.est);
      this.input.value = '';
      this.est = 1;
      this.renderEst();
    });
    document.getElementById('taskEstDown')?.addEventListener('click', () => { this.est = Math.max(1, this.est - 1); this.renderEst(); });
    document.getElementById('taskEstUp')?.addEventListener('click', () => { this.est = Math.min(20, this.est + 1); this.renderEst(); });
    this.clearBtn?.addEventListener('click', () => this.clearFinished());

    this.renderEst();
    this.render();
  }

  save() {
    Store.set(TASKS_KEY, { items: this.items, activeId: this.activeId });
  }

  changed() {
    this.save();
    this.render();
    this.app.timer?.render();
  }

  renderEst() {
    if (this.estVal) this.estVal.textContent = this.est;
  }

  add(text, est) {
    const task = { id: Date.now(), text, est, done: 0, finished: false };
    this.items.push(task);
    if (!this.active()) this.activeId = task.id;
    this.changed();
  }

  find(id) {
    return this.items.find(t => t.id === id);
  }

  active() {
    const task = this.find(this.activeId);
    return task && !task.finished ? task : null;
  }

  activeText() {
    return this.active()?.text || null;
  }

  // A focus session finished: count it towards the active task
  creditActive() {
    const task = this.active();
    if (!task) return null;
    task.done++;
    this.changed();
    return task.text;
  }

  setActive(id) {
    const task = this.find(id);
    if (!task || task.finished) return;
    this.activeId = id;
    this.changed();
  }

  toggleFinished(id) {
    const task = this.find(id);
    if (!task) return;
    task.finished = !task.finished;
    if (task.finished && this.activeId === id) {
      this.activeId = this.items.find(t => !t.finished)?.id ?? null;
    } else if (!task.finished && !this.active()) {
      this.activeId = id;
    }
    this.changed();
  }

  adjust(id, delta) {
    const task = this.find(id);
    if (!task) return;
    task.est = Math.min(20, Math.max(1, task.est + delta));
    this.changed();
  }

  remove(id) {
    this.items = this.items.filter(t => t.id !== id);
    if (this.activeId === id) this.activeId = this.items.find(t => !t.finished)?.id ?? null;
    this.changed();
  }

  clearFinished() {
    this.items = this.items.filter(t => !t.finished);
    this.changed();
  }

  render() {
    if (!this.list) return;
    const activeId = this.active()?.id;
    this.list.replaceChildren(...this.items.map(task => {
      const li = document.createElement('li');
      li.className = 'task';
      li.classList.toggle('is-active', task.id === activeId);
      li.classList.toggle('is-finished', task.finished);

      const text = document.createElement('button');
      text.className = 'task-text';
      text.textContent = task.text;
      text.title = task.finished ? '' : 'Work on this next';
      text.addEventListener('click', () => this.setActive(task.id));

      const count = document.createElement('span');
      count.className = 'task-count';
      const less = document.createElement('button');
      less.textContent = '−';
      less.setAttribute('aria-label', 'Fewer pomodoros');
      less.addEventListener('click', () => this.adjust(task.id, -1));
      const more = document.createElement('button');
      more.textContent = '+';
      more.setAttribute('aria-label', 'More pomodoros');
      more.addEventListener('click', () => this.adjust(task.id, 1));
      const tally = document.createElement('span');
      tally.textContent = `${task.done}/${task.est}`;
      tally.title = `${task.done} of ${task.est} pomodoros done`;
      count.append(less, tally, more);

      const check = document.createElement('button');
      check.className = 'task-check';
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', String(task.finished));
      check.setAttribute('aria-label', `Finished: ${task.text}`);
      check.textContent = task.finished ? '✓' : '';
      check.addEventListener('click', () => this.toggleFinished(task.id));

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '×';
      del.setAttribute('aria-label', `Delete ${task.text}`);
      del.addEventListener('click', () => this.remove(task.id));

      li.append(text, count, check, del);
      return li;
    }));
    if (this.clearBtn) this.clearBtn.hidden = !this.items.some(t => t.finished);
    this.renderSummary();
  }

  // Pomodoros left and a rough finish time, counting the breaks in between
  renderSummary() {
    if (!this.summary) return;
    const open = this.items.filter(t => !t.finished);
    const left = open.reduce((n, t) => n + Math.max(0, t.est - t.done), 0);
    if (this.items.length === 0) {
      this.summary.textContent = '';
      return;
    }
    if (left === 0) {
      this.summary.textContent = open.length ? 'Estimates used up. Add pomodoros to a task to plan more.' : 'All done.';
      return;
    }
    const s = this.app.timer?.settings || loadSettings();
    let cycles = this.app.timer?.cycles || 0;
    let minutes = left * s.focus;
    for (let i = 1; i < left; i++) {
      cycles++;
      if (cycles >= s.longEvery) { minutes += s.longBreak; cycles = 0; }
      else minutes += s.shortBreak;
    }
    const finish = DOMUtils.fmtClockTime(Date.now() + minutes * 60000);
    this.summary.textContent = `${left} pomodoro${left === 1 ? '' : 's'} left, done around ${finish}`;
  }
}

// ── History and stats ────────────────────────────────────────────────────────

class History {
  static MAX = 300;

  static load() {
    const log = Store.get(HISTORY_KEY, []);
    return Array.isArray(log) ? log : [];
  }

  static save(log) {
    Store.set(HISTORY_KEY, log);
  }

  static isToday(ts) {
    return new Date(ts).toDateString() === new Date().toDateString();
  }

  static focusMinutesToday(log) {
    return log.filter(e => e.type === 'focus' && this.isToday(e.at)).reduce((n, e) => n + e.minutes, 0);
  }

  static add(entry) {
    const log = this.load();
    const before = this.focusMinutesToday(log);
    log.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...entry });
    if (log.length > this.MAX) log.length = this.MAX;
    this.save(log);
    const goal = loadSettings().goal;
    const after = this.focusMinutesToday(log);
    if (before < goal && after >= goal) {
      window.app?.toast?.('Daily goal reached.', `${DOMUtils.fmtMinutes(after)} of focus today.`);
    }
    this.render();
  }

  static remove(id) {
    this.save(this.load().filter(e => e.id !== id));
    this.render();
  }

  static clear() {
    this.save([]);
    this.render();
  }

  static fmtWhen(ts) {
    const d = new Date(ts);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const time = DOMUtils.fmtClockTime(ts);
    if (d.toDateString() === now.toDateString()) return time;
    if (d.toDateString() === yesterday.toDateString()) return `yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  }

  // Consecutive days with a focus session, counting back from today (or yesterday)
  static streak(log) {
    const days = new Set(log.filter(e => e.type === 'focus').map(e => new Date(e.at).toDateString()));
    const day = new Date();
    if (!days.has(day.toDateString())) day.setDate(day.getDate() - 1);
    let n = 0;
    while (days.has(day.toDateString())) {
      n++;
      day.setDate(day.getDate() - 1);
    }
    return n;
  }

  static render() {
    const log = this.load();
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const today = log.filter(e => this.isToday(e.at));
    const focus = today.filter(e => e.type === 'focus');
    const focusMin = focus.reduce((n, e) => n + e.minutes, 0);
    const goal = loadSettings().goal;

    // Counts beside the phase names
    [
      ['countFocus', focus.length],
      ['countShort', today.filter(e => e.kind === 'short').length],
      ['countLong', today.filter(e => e.kind === 'long').length]
    ].forEach(([id, n]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = n;
      el.toggleAttribute('data-zero', n === 0);
    });

    const todayText = document.getElementById('todayText');
    if (todayText) {
      todayText.textContent = `${DOMUtils.fmtMinutes(focusMin)} / ${DOMUtils.fmtMinutes(goal)}`;
      todayText.classList.toggle('is-met', focusMin >= goal);
    }
    setText('goalText', `${DOMUtils.fmtMinutes(focusMin)} of ${DOMUtils.fmtMinutes(goal)}`);
    const fill = document.getElementById('goalFill');
    if (fill) fill.style.width = `${Math.min(100, (focusMin / goal) * 100).toFixed(1)}%`;

    setText('statFocus', DOMUtils.fmtMinutes(focusMin));
    setText('statSessions', focus.length);
    setText('statStreak', this.streak(log));

    // Today's worldline: every session on a 24-hour line
    const strip = document.getElementById('dayStrip');
    if (strip) {
      const DAY = 86400000;
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const start0 = midnight.getTime();
      const pct = ms => `${(((ms - start0) / DAY) * 100).toFixed(3)}%`;
      const segs = today.map(e => {
        const start = Math.max(start0, e.at - e.minutes * 60000);
        const seg = document.createElement('span');
        seg.className = e.type === 'break' ? 'day-seg day-seg--break' : 'day-seg';
        seg.style.left = pct(start);
        seg.style.width = `${(((e.at - start) / DAY) * 100).toFixed(3)}%`;
        seg.title = `${e.name} · ${e.minutes}m`;
        return seg;
      });
      const now = document.createElement('span');
      now.className = 'day-now';
      now.style.left = pct(Date.now());
      strip.replaceChildren(...segs, now);
    }

    setText('historyCount', log.length);
    const list = document.getElementById('historyList');
    if (!list) return;
    list.replaceChildren(...log.map(entry => {
      const li = document.createElement('li');
      li.className = entry.type === 'break' ? 'history-item history-item--break' : 'history-item';
      const dot = document.createElement('span');
      dot.className = 'history-dot';
      const name = document.createElement('span');
      name.className = 'history-name';
      name.textContent = entry.name;
      const meta = document.createElement('span');
      meta.className = 'history-meta';
      meta.textContent = `${entry.minutes}m · ${this.fmtWhen(entry.at)}`;
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '×';
      del.setAttribute('aria-label', `Remove ${entry.name}`);
      del.addEventListener('click', () => this.remove(entry.id));
      li.append(dot, name, meta, del);
      return li;
    }));
  }
}

// ── Built-in scenes, painted on a canvas ─────────────────────────────────────

const SCENES = {
  forest: {
    label: 'Night forest', caption: 'Pines in fog under a small moon.', theme: '#0a0e11',
    sky: ['#06090b', '#121c22', '#34444b'], haze: '#52636a', near: '#030506',
    stars: 0.12, rough: 0.38, trees: true, fog: 0.3, light: [0.72, 0.2, 0.028, '214, 222, 226']
  },
  horizon: {
    label: 'Event horizon', caption: 'A black hole and its accretion disk, bent by its own gravity.', theme: '#050407',
    blackHole: true
  },
  obsidian: {
    label: 'Obsidian', caption: 'Ridges of volcanic glass under a violet sky.', theme: '#0b0915',
    sky: ['#07060f', '#16112e', '#3a2660'], haze: '#5b4288', near: '#050409',
    stars: 1, rough: 0.6, fog: 0.16, light: [0.76, 0.27, 0.045, '226, 214, 255']
  },
  glacier: {
    label: 'Glacier', caption: 'Cold ridges in the hour before dawn.', theme: '#08131f',
    sky: ['#050b14', '#0f2944', '#4d82a6'], haze: '#6b9bbd', near: '#040910',
    stars: 0.6, rough: 0.68, fog: 0.16, light: [0.2, 0.25, 0.035, '225, 240, 255']
  }
};

class Scenery {
  constructor() {
    this.canvases = [document.getElementById('sceneSharp'), document.getElementById('sceneSoft')].filter(Boolean);
    this.grid = document.getElementById('sceneGrid');
    let saved = Store.get(SCENE_KEY, 'forest');
    if (saved === 'winden') { // renamed
      saved = 'forest';
      Store.set(SCENE_KEY, saved);
    }
    this.current = SCENES[saved] ? saved : 'forest';
    this.swatchesDrawn = false;
    this.lastSize = '';
    this.onPick = null;

    this.buildPicker();
    this.apply(this.current, { save: false });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.paintMain(), 150);
    });
  }

  get scene() {
    return SCENES[this.current];
  }

  buildPicker() {
    if (!this.grid) return;
    Object.entries(SCENES).forEach(([id, scene]) => {
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.dataset.scene = id;
      const swatch = document.createElement('canvas');
      swatch.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = scene.label;
      btn.append(swatch, label);
      btn.addEventListener('click', () => {
        this.apply(id);
        this.onPick?.(id);
      });
      this.grid.appendChild(btn);
    });
  }

  renderSwatches() {
    if (this.swatchesDrawn || !this.grid) return;
    this.grid.querySelectorAll('.thumb').forEach(btn => {
      const c = btn.querySelector('canvas');
      if (c && c.clientWidth) Scenery.paint(c, SCENES[btn.dataset.scene], c.clientWidth, c.clientHeight);
    });
    this.swatchesDrawn = true;
  }

  markActive(active) {
    this.grid?.querySelectorAll('.thumb').forEach(btn => {
      btn.setAttribute('aria-pressed', String(active && btn.dataset.scene === this.current));
    });
  }

  apply(id, { save = true } = {}) {
    if (!SCENES[id]) return;
    this.current = id;
    document.documentElement.dataset.scene = id;
    if (save) Store.set(SCENE_KEY, id);
    this.markActive(true);
    this.lastSize = '';
    this.paintMain();
  }

  paintMain() {
    const first = this.canvases[0];
    if (!first) return;
    const w = first.clientWidth || window.innerWidth;
    const h = first.clientHeight || window.innerHeight;
    const size = `${this.current}:${w}x${h}`;
    if (size === this.lastSize) return;
    this.lastSize = size;
    this.canvases.forEach(c => {
      Scenery.paint(c, this.scene, w, h);
      c.classList.add('is-ready');
    });
  }

  static rng(seedText) {
    let a = 0;
    for (const ch of seedText) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static mix(hexA, hexB, t, alpha = 1) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const ch = shift => Math.round(((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * t);
    return `rgba(${ch(16)}, ${ch(8)}, ${ch(0)}, ${alpha})`;
  }

  // Midpoint displacement gives sharp, faceted crests
  static ridge(rand, levels, rough) {
    const n = 1 << levels;
    const pts = new Float32Array(n + 1);
    pts[0] = rand();
    pts[n] = rand();
    let step = n, scale = 1;
    while (step > 1) {
      const half = step / 2;
      for (let i = half; i < n; i += step) pts[i] = (pts[i - half] + pts[i + half]) / 2 + (rand() * 2 - 1) * scale;
      scale *= rough;
      step = half;
    }
    let min = Infinity, max = -Infinity;
    pts.forEach(v => { min = Math.min(min, v); max = Math.max(max, v); });
    return Array.from(pts, v => (v - min) / (max - min || 1));
  }

  static stars(ctx, rand, w, h, density, band = 0.62) {
    const count = Math.round((w * h) / 1600 * density);
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = Math.pow(rand(), 1.4) * h * band;
      const r = 0.25 + rand() * 0.95;
      const alpha = (0.2 + rand() * 0.7) * (1 - y / (h * (band + 0.08)));
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  static paint(canvas, scene, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = Scenery.rng(scene.label);
    if (scene.blackHole) Scenery.paintBlackHole(ctx, rand, w, h);
    else Scenery.paintRidges(ctx, rand, scene, w, h);
  }

  static paintRidges(ctx, rand, scene, w, h) {
    const TAU = Math.PI * 2;
    const [lx, ly, lr, lightRgb] = scene.light;

    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.78);
    sky.addColorStop(0, scene.sky[0]);
    sky.addColorStop(0.55, scene.sky[1]);
    sky.addColorStop(1, scene.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    Scenery.stars(ctx, rand, w, h, scene.stars);

    // Moon or low sun
    const cx = lx * w, cy = ly * h, radius = Math.max(1.5, lr * Math.min(w, h));
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 7);
    halo.addColorStop(0, `rgba(${lightRgb}, 0.32)`);
    halo.addColorStop(1, `rgba(${lightRgb}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgba(${lightRgb}, 0.92)`;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fill();

    // Ridges, far to near, with fog between them
    const LAYERS = 6;
    for (let i = 0; i < LAYERS; i++) {
      const t = i / (LAYERS - 1);
      const base = h * (0.56 + 0.36 * t);
      const amp = h * (0.2 - 0.1 * t);
      const pts = Scenery.ridge(rand, 5 + Math.round(t * 2), scene.rough);
      const color = Scenery.mix(scene.haze, scene.near, Math.pow(t, 0.7));
      const yAt = k => base - pts[k] * amp;
      const xAt = k => (k / (pts.length - 1)) * w;

      ctx.beginPath();
      ctx.moveTo(0, h);
      pts.forEach((_, k) => ctx.lineTo(xAt(k), yAt(k)));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Faint rim light along the crest
      ctx.beginPath();
      pts.forEach((_, k) => (k ? ctx.lineTo(xAt(k), yAt(k)) : ctx.moveTo(xAt(k), yAt(k))));
      ctx.strokeStyle = `rgba(${lightRgb}, ${(0.05 + 0.1 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (scene.trees && t > 0.3) {
        ctx.fillStyle = color;
        for (let x = 0; x < w; x += 3 + rand() * 9) {
          const pos = (x / w) * (pts.length - 1);
          const k = Math.floor(pos), f = pos - k;
          const y = base - (pts[k] + ((pts[k + 1] ?? pts[k]) - pts[k]) * f) * amp;
          const th = h * (0.02 + rand() * 0.05) * (0.4 + t);
          ctx.beginPath();
          ctx.moveTo(x - th * 0.18, y + 2);
          ctx.lineTo(x, y - th);
          ctx.lineTo(x + th * 0.18, y + 2);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (i < LAYERS - 1) {
        const top = base - amp * 0.6;
        const fog = ctx.createLinearGradient(0, top, 0, base + h * 0.05);
        fog.addColorStop(0, Scenery.mix(scene.haze, scene.haze, 0, 0));
        fog.addColorStop(1, Scenery.mix(scene.haze, scene.haze, 0, (scene.fog * (1 - t)).toFixed(3)));
        ctx.fillStyle = fog;
        ctx.fillRect(0, top, w, h - top);
      }
    }
  }

  // A Gargantua-style black hole: the disk passes behind and in front of the shadow,
  // and its far side is lensed into a ring over the top
  static paintBlackHole(ctx, rand, w, h) {
    const TAU = Math.PI * 2;
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.66, h * 0.38, 0, w * 0.66, h * 0.38, Math.max(w, h) * 0.6);
    glow.addColorStop(0, 'rgba(90, 50, 30, 0.35)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    Scenery.stars(ctx, rand, w, h, 1.4, 1);

    const cx = w * 0.66, cy = h * 0.38, R = Math.min(w, h) * 0.12;
    const tilt = -0.08;
    const disk = (from, to) => {
      for (let k = 0; k < 140; k++) {
        const t = k / 139;
        const rx = R * (1.5 + 2.1 * t);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, rx * 0.17, tilt, from, to);
        ctx.strokeStyle = t < 0.25
          ? `rgba(255, 244, 222, ${(0.2 * (1 - t)).toFixed(3)})`
          : `rgba(255, ${Math.round(190 - 90 * t)}, ${Math.round(110 - 80 * t)}, ${(0.15 * Math.pow(1 - t, 1.6)).toFixed(3)})`;
        ctx.lineWidth = R * 0.05;
        ctx.stroke();
      }
    };

    disk(Math.PI, TAU); // far half, behind the shadow
    for (let k = 0; k < 70; k++) {
      const t = k / 69;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1.1 + 0.55 * t), Math.PI * 1.02, Math.PI * 1.98);
      ctx.strokeStyle = `rgba(255, ${Math.round(225 - 90 * t)}, ${Math.round(170 - 110 * t)}, ${(0.13 * Math.pow(1 - t, 1.4)).toFixed(3)})`;
      ctx.lineWidth = R * 0.045;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.04, 0, TAU);
    ctx.strokeStyle = 'rgba(255, 238, 214, 0.85)';
    ctx.lineWidth = Math.max(1, R * 0.025);
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    disk(0, Math.PI); // near half, in front of the shadow
  }
}

// ── Picture of the day (NASA or Bing, passed through the worker) ─────────────

const PICTURE_FEED_VERSION = 3; // bump when the worker's list format changes, to skip stale caches
const PICTURE_SOURCES = {
  apod: { who: 'NASA', picture: 'NASA\u2019s space picture' },
  bing: { who: 'Bing', picture: 'Bing\u2019s photo' }
};

class Wallpaper {
  constructor(scenery) {
    this.scenery = scenery;
    this.root = document.documentElement;
    this.prefs = { source: 'apod', preferDark: false, develop: true, dim: 20, pick: null, ...Store.get(WALL_KEY, {}) };
    if (!PICTURE_SOURCES[this.prefs.source] && this.prefs.source !== 'scene') this.prefs.source = 'apod';
    // Earlier versions defaulted "prefer dark" on, which could hide today's picture
    if ((this.prefs.rev || 0) < 2) {
      this.prefs.preferDark = false;
      this.prefs.rev = 2;
      Store.set(WALL_KEY, this.prefs);
    }
    this.stats = Store.get(WALL_STATS_KEY, {});
    this.lists = {}; // recent pictures per source
    this.shownSource = null; // the source on screen, which differs from prefs.source after a fallback
    this.current = null;
    this.currentSrc = null;
    this.gridBuilt = false;
    this.gridWanted = false; // the sheet has been opened, so keep the thumbnails up to date
    this.gridSource = null;
    this.onChange = null;

    this.els = {
      sources: document.querySelectorAll('input[name="wallSource"]'),
      dark: document.getElementById('wallDark'),
      develop: document.getElementById('wallDevelop'),
      dim: document.getElementById('wallDim'),
      dimVal: document.getElementById('wallDimVal'),
      grid: document.getElementById('wallGrid'),
      status: document.getElementById('wallStatus'),
      captionTitle: document.getElementById('captionTitle'),
      captionText: document.getElementById('captionText'),
      captionLink: document.getElementById('captionLink')
    };
    this.defaultStatus = this.els.status?.textContent || '';
    this.note = null; // why the picture on screen isn't from the chosen source

    this.els.sources.forEach(input => input.addEventListener('change', () => {
      if (!input.checked) return;
      this.prefs.source = input.value;
      this.prefs.pick = null;
      this.savePrefs();
      this.note = null;
      this.setStatus(null);
      this.prefs.source === 'scene' ? this.useScene() : this.refresh();
    }));
    this.els.dark?.addEventListener('change', () => {
      this.prefs.preferDark = this.els.dark.checked;
      this.prefs.pick = null;
      this.savePrefs();
      this.refresh();
    });
    this.els.develop?.addEventListener('change', () => {
      this.prefs.develop = this.els.develop.checked;
      this.savePrefs();
      this.onChange?.();
    });
    this.els.dim?.addEventListener('input', () => {
      this.prefs.dim = parseInt(this.els.dim.value, 10);
      this.savePrefs();
      this.applyDim();
      if (this.current && this.stats[this.current.id]) this.saveLook(this.applyLook(this.stats[this.current.id]));
    });

    this.syncControls();
    this.applyDim();
    this.updateCaption();
    if (this.prefs.source === 'scene') this.useScene();
    else this.refresh();
  }

  get photoOn() {
    return this.prefs.source !== 'scene';
  }

  savePrefs() {
    Store.set(WALL_KEY, this.prefs);
    this.syncControls();
  }

  syncControls() {
    const on = this.photoOn;
    this.els.sources.forEach(input => { input.checked = input.value === this.prefs.source; });
    if (this.els.dark) { this.els.dark.checked = this.prefs.preferDark; this.els.dark.disabled = !on; }
    if (this.els.develop) this.els.develop.checked = this.prefs.develop;
    if (this.els.dim) { this.els.dim.value = this.prefs.dim; this.els.dim.disabled = !on; }
    if (this.els.dimVal) this.els.dimVal.textContent = this.prefs.dim;
    this.scenery.markActive(!on);
  }

  setStatus(text) {
    if (this.els.status) this.els.status.textContent = text || this.note || this.defaultStatus;
  }

  applyDim() {
    this.root.style.setProperty('--dim', (this.prefs.dim / 100).toFixed(2));
  }

  turnOff() {
    this.prefs.source = 'scene';
    this.savePrefs();
    this.useScene();
  }

  static valid(img) {
    const ok = url => typeof url === 'string' && url.startsWith('/api/wallpaper/image?') && !/["\\)\s]/.test(url);
    return img && typeof img.id === 'string' && img.src && ['thumb', 'sd', 'hd', 'portrait'].every(k => ok(img.src[k]));
  }

  async load(source) {
    if (this.lists[source]) return this.lists[source];
    const res = await fetch(`/api/wallpaper?source=${source}&v=${PICTURE_FEED_VERSION}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const images = (data.images || []).filter(Wallpaper.valid);
    if (!images.length) throw new Error('no pictures');
    this.lists[source] = images;
    return images;
  }

  get images() {
    return this.lists[this.shownSource || this.prefs.source] || [];
  }

  // A picture that won't load leaves the list, so it isn't offered again this visit
  forget(img) {
    let dropped = false;
    for (const source of Object.keys(this.lists)) {
      const kept = this.lists[source].filter(i => i !== img);
      dropped ||= kept.length !== this.lists[source].length;
      this.lists[source] = kept;
    }
    if (dropped && this.gridBuilt) {
      this.gridBuilt = false;
      this.renderGrid();
    }
  }

  // Today's picture from the chosen source; if that source doesn't answer, the other
  // one; if neither does, a painted scene. Each fallback says so.
  async refresh() {
    const source = this.prefs.source;
    if (source === 'scene') return;
    this.note = null;
    this.setStatus(null);
    const order = [source, ...Object.keys(PICTURE_SOURCES).filter(s => s !== source)];
    for (const candidate of order) {
      try {
        const images = await this.load(candidate);
        const first = await this.choose(images);
        if (this.prefs.source !== source) return;
        // If a picture won't load, try the next couple before giving up on the source
        const tries = [first, ...images.filter(img => img !== first)].slice(0, 3);
        let shown = false;
        for (const img of tries) {
          try {
            await this.show(img, candidate);
            shown = true;
            break;
          } catch {
            this.forget(img);
          }
        }
        if (!shown) throw new Error('no picture loaded');
        if (candidate !== source) {
          const wanted = PICTURE_SOURCES[source], used = PICTURE_SOURCES[candidate];
          this.note = `${wanted.who} didn\u2019t answer, so ${used.picture} of the day is showing instead.`;
          this.setStatus(null);
          window.app?.toast?.('Picture of the day.', `${wanted.who} didn\u2019t answer, so this one is from ${used.who}.`);
        }
        return;
      } catch {
        if (this.prefs.source !== source) return;
      }
    }
    this.useScene();
    this.note = 'Couldn\u2019t load a picture of the day, so a painted scene is showing. It tries again each time you open the site.';
    this.setStatus(null);
    window.app?.toast?.('Picture of the day.', 'Couldn\u2019t load one right now, so this is a painted scene.');
  }

  async choose(images) {
    const today = new Date().toDateString();
    const pick = this.prefs.pick;
    if (pick && pick.day === today) {
      const picked = images.find(img => img.id === pick.id);
      if (picked) return picked;
    }
    if (!this.prefs.preferDark) return images[0];
    let darkest = null;
    for (const img of images) {
      const s = await this.analyze(img).catch(() => null);
      if (!s) continue;
      if (s.lum < DARK_PHOTO_LUM) return img;
      if (!darkest || s.lum < this.stats[darkest.id].lum) darkest = img;
    }
    return darkest || images[0];
  }

  // Portrait crop on tall screens, full resolution on large ones
  static pickSrc(img) {
    if (window.innerHeight > window.innerWidth) return img.src.portrait;
    const dpr = window.devicePixelRatio || 1;
    return window.innerWidth * dpr > 1400 ? img.src.hd : img.src.sd;
  }

  static loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async analyze(img) {
    if (this.stats[img.id]) return this.stats[img.id];
    const el = await Wallpaper.loadImage(img.src.thumb);
    const s = Wallpaper.measure(el);
    this.stats[img.id] = s;
    const ids = Object.keys(this.stats);
    if (ids.length > 60) ids.slice(0, ids.length - 60).forEach(k => delete this.stats[k]);
    Store.set(WALL_STATS_KEY, this.stats);
    return s;
  }

  // Brightness (weighted to the lower left, where the time sits) and the strongest hue
  static measure(img) {
    const W = 48, H = 30;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    const bins = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    let lumSum = 0, weightSum = 0, r = 0, g = 0, b = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const w = 0.4 + 0.6 * Math.max(0, 1 - Math.hypot(x / (W - 1) - 0.2, y / (H - 1) - 0.8));
        lumSum += Wallpaper.luminance([R, G, B]) * w;
        weightSum += w;
        r += R; g += G; b += B;
        const [hue, sat, light] = Wallpaper.rgbToHsl([R, G, B]);
        if (sat > 0.2 && light > 0.15 && light < 0.85) {
          const bin = bins[Math.floor(hue * 18) % 18];
          const bw = sat * sat * (1 - Math.abs(light - 0.5));
          bin.w += bw; bin.r += R * bw; bin.g += G * bw; bin.b += B * bw;
        }
      }
    }
    const n = W * H;
    const best = bins.reduce((a, x) => (x.w > a.w ? x : a));
    const accent = best.w > n * 0.01 ? Wallpaper.rgbToHsl([best.r / best.w, best.g / best.w, best.b / best.w]) : null;
    return {
      lum: +(lumSum / weightSum).toFixed(4),
      avg: [r / n, g / n, b / n].map(Math.round),
      accent: accent && accent.map(v => +v.toFixed(3))
    };
  }

  static luminance([r, g, b]) {
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  static contrast(a, b) {
    const la = Wallpaper.luminance(a), lb = Wallpaper.luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  static rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h / 6, s, l];
  }

  static hslToRgb([h, s, l]) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = t => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map(v => Math.round(v * 255));
  }

  static hex(rgb) {
    return `#${rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  }

  // An accent from the picture's hue, lightened or darkened until it reads on the tone
  static accentFor(hsl, tone) {
    const h = hsl ? hsl[0] : 0.12;
    const s = hsl ? Math.min(0.85, Math.max(0.45, hsl[1])) : 0.8;
    if (tone === 'dark') {
      const ink = Wallpaper.hslToRgb([h, Math.min(s, 0.5), 0.1]);
      let l = 0.72;
      let accent = Wallpaper.hslToRgb([h, s, l]);
      while (Wallpaper.contrast(accent, ink) < 7 && l < 0.9) {
        l += 0.02;
        accent = Wallpaper.hslToRgb([h, s, l]);
      }
      return { accent: Wallpaper.hex(accent), ink: Wallpaper.hex(ink) };
    }
    let l = 0.45;
    let accent = Wallpaper.hslToRgb([h, s, l]);
    while (Wallpaper.contrast(accent, [255, 255, 255]) < 4.6 && l > 0.2) {
      l -= 0.02;
      accent = Wallpaper.hslToRgb([h, s, l]);
    }
    return { accent: Wallpaper.hex(accent), ink: '#ffffff' };
  }

  applyLook(s) {
    const tone = s.lum * (1 - this.prefs.dim / 100) > LIGHT_UI_LUM ? 'light' : 'dark';
    const { accent, ink } = Wallpaper.accentFor(s.accent, tone);
    const toward = tone === 'dark' ? [0, 0, 0] : [255, 255, 255];
    const bg = Wallpaper.hex(s.avg.map((v, i) => v + (toward[i] - v) * 0.7));
    this.root.dataset.tone = tone;
    this.root.style.setProperty('--accent', accent);
    this.root.style.setProperty('--accent-ink', ink);
    this.root.style.setProperty('--bg', bg);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    this.onChange?.();
    return { tone, accent, ink, bg };
  }

  async show(img, from = this.prefs.source) {
    const source = this.prefs.source;
    const stats = await this.analyze(img);
    let src = Wallpaper.pickSrc(img);
    try {
      await Wallpaper.loadImage(src);
    } catch {
      if (src === img.src.sd) throw new Error('picture failed');
      src = img.src.sd;
      await Wallpaper.loadImage(src);
    }
    if (this.prefs.source !== source) return;
    this.current = img;
    this.currentSrc = src;
    this.shownSource = from;
    this.root.style.setProperty('--wall', `url("${src}")`);
    this.root.dataset.wall = 'on';
    this.saveLook(this.applyLook(stats));
    this.scenery.markActive(false);
    this.updateCaption();
    this.renderGrid();
  }

  saveLook(look) {
    if (this.currentSrc) Store.set(LOOK_KEY, { ...look, wall: this.currentSrc, dim: this.prefs.dim });
  }

  useScene() {
    this.current = null;
    this.currentSrc = null;
    this.shownSource = null;
    this.root.dataset.wall = 'off';
    this.root.dataset.tone = 'dark';
    ['--accent', '--accent-ink', '--bg', '--wall'].forEach(p => this.root.style.removeProperty(p));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.scenery.scene.theme);
    Store.remove(LOOK_KEY);
    this.scenery.markActive(true);
    this.updateCaption();
    this.renderGrid();
    this.onChange?.();
  }

  // The museum label in the corner: the picture's title, caption and credit, or the scene's
  updateCaption() {
    const { captionTitle, captionText, captionLink } = this.els;
    const img = this.current;
    if (captionTitle) captionTitle.textContent = img ? (img.title || 'Picture of the day') : this.scenery.scene.label;
    if (captionText) {
      captionText.textContent = img
        ? [img.caption, img.credit].filter(Boolean).join(' ')
        : `${this.scenery.scene.caption} Painted in your browser.`;
    }
    if (captionLink) {
      captionLink.hidden = !img?.link;
      if (img?.link) captionLink.href = img.link;
    }
  }

  static dayLabel(yyyymmdd) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(yyyymmdd || '');
    if (!m) return '';
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'today';
    if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Thumbnails of recent pictures from the source on screen; built the first time the sheet opens
  renderGrid(build = false) {
    const grid = this.els.grid;
    if (!grid) return;
    if (build) this.gridWanted = true;
    if (!this.photoOn || !this.images.length) {
      grid.replaceChildren();
      this.gridBuilt = false;
      return;
    }
    if (this.gridSource !== this.shownSource) this.gridBuilt = false;
    if (!this.gridBuilt && this.gridWanted) {
      // An even count, so the two-column grid never ends on a lone thumbnail
      const shown = this.images.length > 1 ? this.images.slice(0, this.images.length - (this.images.length % 2)) : this.images;
      grid.replaceChildren(...shown.map(img => {
        const btn = document.createElement('button');
        btn.className = 'thumb';
        btn.dataset.id = img.id;
        btn.title = img.title || '';
        const pic = document.createElement('img');
        pic.src = img.src.thumb;
        pic.alt = '';
        pic.loading = 'lazy';
        pic.addEventListener('error', () => this.forget(img));
        const label = document.createElement('span');
        label.textContent = Wallpaper.dayLabel(img.date) || img.title || 'picture';
        btn.append(pic, label);
        btn.addEventListener('click', () => {
          this.prefs.pick = { id: img.id, day: new Date().toDateString() };
          this.savePrefs();
          this.setStatus(null);
          this.show(img, this.shownSource || this.prefs.source).catch(() => {
            this.forget(img);
            this.setStatus('That picture didn\'t load. Try another one.');
          });
        });
        return btn;
      }));
      this.gridBuilt = true;
      this.gridSource = this.shownSource;
    }
    grid.querySelectorAll('.thumb').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.id === this.current?.id));
    });
  }
}

// ── Sheets and modals ────────────────────────────────────────────────────────

class Sheet {
  static all = [];

  constructor(panelId, triggerIds, { onOpen } = {}) {
    this.panel = document.getElementById(panelId);
    this.triggers = triggerIds.map(id => document.getElementById(id)).filter(Boolean);
    this.onOpen = onOpen;
    if (!this.panel) return;
    Sheet.all.push(this);

    this.triggers.forEach(t => t.addEventListener('click', () => this.toggle()));
    this.panel.querySelector('[data-close]')?.addEventListener('click', () => this.close());

    // composedPath survives re-renders that detach the clicked node
    document.addEventListener('click', e => {
      if (!this.isOpen) return;
      const path = e.composedPath();
      if (path.includes(this.panel) || this.triggers.some(t => path.includes(t))) return;
      if (path.some(el => el.classList?.contains('overlay'))) return;
      this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen && !document.querySelector('.overlay.open')) this.close();
    });
    this.close();
  }

  get isOpen() { return this.panel?.classList.contains('open'); }

  open() {
    Sheet.all.forEach(s => { if (s !== this) s.close(); });
    this.panel.classList.add('open');
    this.panel.inert = false;
    this.triggers.forEach(t => t.setAttribute('aria-expanded', 'true'));
    this.onOpen?.();
  }

  close() {
    if (!this.panel) return;
    this.panel.classList.remove('open');
    this.panel.inert = true;
    this.triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
  }

  toggle() { this.isOpen ? this.close() : this.open(); }
}

class Modal {
  constructor(id, { openers = [] } = {}) {
    this.el = document.getElementById(id);
    if (!this.el) return;
    this.el.inert = true;
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
    this.el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.close()));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen) this.close(); });
    openers.forEach(openerId => {
      document.getElementById(openerId)?.addEventListener('click', e => { e.preventDefault(); this.open(); });
    });
  }

  get isOpen() { return this.el?.classList.contains('open'); }

  open() {
    this.returnFocus = document.activeElement;
    this.el.inert = false;
    this.el.classList.add('open');
    this.el.setAttribute('aria-hidden', 'false');
    setTimeout(() => this.el.querySelector('.panel-actions .btn--primary')?.focus(), 50);
  }

  close() {
    this.el.classList.remove('open');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.inert = true;
    this.returnFocus?.focus?.();
  }
}

// ── The browser tab's icon becomes a progress ring while a timer runs ────────

class TabIcon {
  constructor() {
    this.link = document.querySelector('link[rel="icon"]');
    this.baseHref = this.link?.getAttribute('href');
    this.baseType = this.link?.getAttribute('type');
    this.canvas = document.createElement('canvas');
    this.canvas.width = 64;
    this.canvas.height = 64;
    this.key = null;
  }

  render(timer) {
    if (!this.link) return;
    if (!timer.running) {
      if (this.key !== null) {
        this.link.setAttribute('type', this.baseType);
        this.link.setAttribute('href', this.baseHref);
        this.key = null;
      }
      return;
    }
    const left = timer.timeLeft / timer.length(timer.mode);
    const rest = timer.mode !== 'pomodoro';
    const key = `${Math.round(left * 60)}:${rest}`;
    if (key === this.key) return;
    this.key = key;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f2c94c';
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#0e0e11';
    ctx.beginPath();
    ctx.arc(32, 32, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rest ? '#d7d9de' : accent;
    ctx.beginPath();
    ctx.arc(32, 32, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
    ctx.stroke();
    this.link.setAttribute('type', 'image/png');
    this.link.setAttribute('href', this.canvas.toDataURL('image/png'));
  }
}

// ── Pop-out mini timer (Document Picture-in-Picture, Chromium browsers) ──────

class PopOut {
  constructor(app) {
    this.app = app;
    this.win = null;
    this.btn = document.getElementById('popoutBtn');
    if (!PopOut.supported || !this.btn) return;
    this.btn.hidden = false;
    this.btn.addEventListener('click', () => this.toggle());
  }

  static get supported() {
    return 'documentPictureInPicture' in window;
  }

  async toggle() {
    if (!PopOut.supported) return;
    if (this.win) {
      this.win.close();
      return;
    }
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width: 300, height: 180 });
      const doc = win.document;
      const css = doc.createElement('link');
      css.rel = 'stylesheet';
      css.href = document.querySelector('link[rel="stylesheet"]').href;
      doc.head.append(css);
      doc.title = '0bsidian';
      doc.body.style.margin = '0';

      const wrap = doc.createElement('div');
      wrap.className = 'pip';
      this.label = doc.createElement('p');
      this.label.className = 'phase-line';
      this.digits = doc.createElement('div');
      this.digits.className = 'timer-digits';
      this.button = doc.createElement('button');
      this.button.className = 'start';
      this.button.addEventListener('click', () => this.app.timer.toggle());
      wrap.append(this.label, this.digits, this.button);
      doc.body.append(wrap);

      this.win = win;
      this.btn.classList.add('is-on');
      win.addEventListener('pagehide', () => {
        this.win = null;
        this.btn.classList.remove('is-on');
      });
      this.render();
    } catch {}
  }

  render() {
    if (!this.win) return;
    const root = this.win.document.documentElement;
    const main = document.documentElement;
    root.dataset.tone = main.dataset.tone;
    root.dataset.scene = main.dataset.scene;
    root.style.cssText = main.style.cssText;
    const timer = this.app.timer;
    this.label.textContent = timer.mode === 'pomodoro' ? timer.phaseLabel() : MODES[timer.mode].label;
    DOMUtils.setDigits(this.digits, timer.clockText());
    this.button.textContent = timer.startLabel();
  }
}

// ── Home: search, shortcuts and the clock ────────────────────────────────────

const ENGINES = {
  google:     { label: 'Google',     url: 'https://www.google.com/search?q=' },
  duckduckgo: { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing:       { label: 'Bing',       url: 'https://www.bing.com/search?q=' },
  pubmed:     { label: 'PubMed',     url: 'https://pubmed.ncbi.nlm.nih.gov/?term=' },
  wikipedia:  { label: 'Wikipedia',  url: 'https://en.wikipedia.org/w/index.php?search=' },
  youtube:    { label: 'YouTube',    url: 'https://www.youtube.com/results?search_query=' }
};
const MAX_SHORTCUTS = 12;
const COMMON_TLDS = new Set(('com net org edu gov mil int info biz dev app xyz site online store tech blog '
  + 'page cloud art design news shop live wiki social email link one top fun club space world').split(' '));

class Home {
  constructor() {
    const hourCycle = new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions().hourCycle || 'h23';
    this.prefs = { engine: 'google', links: [], clock24: !hourCycle.startsWith('h1'), newTab: false, ...Store.get(HOME_KEY, {}) };
    if (!ENGINES[this.prefs.engine]) this.prefs.engine = 'google';
    this.prefs.links = (Array.isArray(this.prefs.links) ? this.prefs.links : [])
      .filter(l => l && typeof l.name === 'string' && Home.normalizeUrl(l.url))
      .slice(0, MAX_SHORTCUTS);

    this.form = document.getElementById('searchForm');
    this.input = document.getElementById('searchInput');
    this.engineSelect = document.getElementById('searchEngine');
    this.engineName = document.getElementById('engineName');
    this.list = document.getElementById('shortcutList');
    this.linkForm = document.getElementById('shortcutForm');
    this.linkName = document.getElementById('shortcutName');
    this.linkUrl = document.getElementById('shortcutUrl');
    this.clock = {
      digits: document.getElementById('clockDigits'),
      day: document.getElementById('clockDay'),
      date: document.getElementById('clockDate'),
      sep: document.getElementById('clockSep'),
      meridiem: document.getElementById('clockMeridiem')
    };

    Object.entries(ENGINES).forEach(([id, engine]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = engine.label;
      this.engineSelect?.appendChild(option);
    });
    this.engineSelect?.addEventListener('change', () => {
      this.prefs.engine = this.engineSelect.value;
      this.save();
      this.renderEngine();
      this.input?.focus();
    });

    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.go(false);
    });
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        this.go(true);
      } else if (e.key === 'Escape') {
        if (this.input.value) this.input.value = '';
        else this.input.blur();
      }
    });

    this.linkForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveLink();
    });
    document.getElementById('shortcutCancel')?.addEventListener('click', () => this.closeLinkForm());
    this.linkForm?.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeLinkForm(); });

    const clock24 = document.getElementById('setClock24');
    const newTab = document.getElementById('setNewTab');
    if (clock24) {
      clock24.checked = this.prefs.clock24;
      clock24.addEventListener('change', () => { this.prefs.clock24 = clock24.checked; this.save(); this.tickClock(); });
    }
    if (newTab) {
      newTab.checked = this.prefs.newTab;
      newTab.addEventListener('change', () => { this.prefs.newTab = newTab.checked; this.save(); });
    }

    this.renderEngine();
    this.renderLinks();
    this.startClock();
  }

  save() {
    Store.set(HOME_KEY, this.prefs);
  }

  focus() {
    this.input?.focus();
  }

  renderEngine() {
    if (this.engineSelect) this.engineSelect.value = this.prefs.engine;
    if (this.engineName) this.engineName.textContent = ENGINES[this.prefs.engine].label;
    if (this.input) this.input.setAttribute('aria-label', `Search ${ENGINES[this.prefs.engine].label}, or type an address`);
  }

  // "github.com" or "https://…" opens the site; anything else is a search
  static addressFrom(text) {
    const t = text.trim();
    if (!t || /\s/.test(t)) return null;
    if (/^https?:\/\//i.test(t)) return Home.normalizeUrl(t);
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#].*)?$/i.test(t)) return Home.normalizeUrl(`http://${t}`);
    const host = /^(?:[a-z0-9-]+\.)+([a-z]{2,})(:\d+)?([/?#].*)?$/i.exec(t);
    if (host && (/^www\./i.test(t) || Home.isTld(host[1]))) return Home.normalizeUrl(`https://${t}`);
    return null;
  }

  // Country codes and the common generic endings, so "node.js" or "Dr.Smith" stays a search
  static isTld(tld) {
    const t = tld.toLowerCase();
    if (t.length === 2) return !['js', 'ts', 'py', 'md'].includes(t);
    return COMMON_TLDS.has(t);
  }

  static normalizeUrl(raw) {
    if (typeof raw !== 'string' || raw.length > 300) return null;
    const value = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
      return null;
    }
  }

  go(newTab) {
    const query = this.input?.value.trim();
    if (!query) {
      this.focus();
      return;
    }
    const url = Home.addressFrom(query) || `${ENGINES[this.prefs.engine].url}${encodeURIComponent(query)}`;
    if (newTab || this.prefs.newTab) {
      window.open(url, '_blank', 'noopener');
      this.input.value = '';
    } else {
      window.location.href = url;
    }
  }

  renderLinks() {
    if (!this.list) return;
    const items = this.prefs.links.map((link, i) => {
      const li = document.createElement('li');
      li.className = 'shortcut';
      const a = document.createElement('a');
      a.href = link.url;
      a.rel = 'noopener';
      a.textContent = link.name;
      a.title = link.url;
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '×';
      del.setAttribute('aria-label', `Remove ${link.name}`);
      del.addEventListener('click', () => {
        this.prefs.links.splice(i, 1);
        this.save();
        this.renderLinks();
      });
      li.append(a, del);
      return li;
    });
    if (this.prefs.links.length < MAX_SHORTCUTS) {
      const li = document.createElement('li');
      const add = document.createElement('button');
      add.className = 'shortcut-add';
      add.textContent = this.prefs.links.length ? '+ add' : '+ add a shortcut';
      add.addEventListener('click', () => this.openLinkForm());
      li.appendChild(add);
      items.push(li);
    }
    this.list.replaceChildren(...items);
  }

  openLinkForm() {
    if (!this.linkForm) return;
    this.linkForm.hidden = false;
    this.list.hidden = true;
    this.linkName.value = '';
    this.linkUrl.value = '';
    this.linkName.focus();
  }

  closeLinkForm() {
    if (!this.linkForm) return;
    this.linkForm.hidden = true;
    this.list.hidden = false;
  }

  saveLink() {
    const url = Home.normalizeUrl(this.linkUrl.value);
    if (!url) {
      this.linkUrl.value = '';
      this.linkUrl.placeholder = 'that address didn’t work, try again';
      this.linkUrl.focus();
      return;
    }
    const name = this.linkName.value.trim() || new URL(url).hostname.replace(/^www\./, '');
    this.prefs.links.push({ name: name.slice(0, 24), url });
    this.save();
    this.closeLinkForm();
    this.renderLinks();
  }

  startClock() {
    this.tickClock();
    setTimeout(() => {
      this.tickClock();
      setInterval(() => this.tickClock(), 60000);
    }, 60000 - (Date.now() % 60000) + 50);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.tickClock(); });
  }

  tickClock() {
    const now = new Date();
    const mins = String(now.getMinutes()).padStart(2, '0');
    let hours = now.getHours();
    let meridiem = '';
    if (!this.prefs.clock24) {
      meridiem = hours < 12 ? 'am' : 'pm';
      hours = hours % 12 || 12;
    }
    DOMUtils.setDigits(this.clock.digits, `${this.prefs.clock24 ? String(hours).padStart(2, '0') : hours}:${mins}`);
    if (this.clock.day) this.clock.day.textContent = now.toLocaleDateString([], { weekday: 'long' });
    if (this.clock.date) this.clock.date.textContent = now.toLocaleDateString([], { day: 'numeric', month: 'long' });
    if (this.clock.meridiem) {
      this.clock.meridiem.hidden = !meridiem;
      this.clock.meridiem.textContent = meridiem;
    }
    if (this.clock.sep) this.clock.sep.hidden = !meridiem;
  }
}

// ── App ──────────────────────────────────────────────────────────────────────

class App {
  constructor() {
    window.app = this;
    LEGACY_KEYS.forEach(k => Store.remove(k));
    const confirmOverlay = document.getElementById('confirmOverlay');
    if (confirmOverlay) confirmOverlay.inert = true;

    this.tabIcon = new TabIcon();
    this.home = new Home();
    this.scenery = new Scenery();
    this.wallpaper = new Wallpaper(this.scenery);
    this.scenery.onPick = () => this.wallpaper.turnOff();
    this.tasks = new Tasks(this);
    this.timer = new Timer(this);
    this.ambience = new Ambience(this);
    this.popout = new PopOut(this);
    this.wallpaper.onChange = () => { this.timer.updateDevelop(); this.popout.render(); };
    this.tasks.render();

    const canHover = window.matchMedia('(hover: hover)').matches;
    this.sheets = {
      tasks: new Sheet('tasksSheet', ['tasksBtn', 'phaseTask'], {
        onOpen: () => { if (canHover) setTimeout(() => document.getElementById('taskInput')?.focus(), 200); }
      }),
      sounds: new Sheet('soundsSheet', ['soundsBtn']),
      today: new Sheet('todaySheet', ['statsBtn'], { onOpen: () => History.render() }),
      photo: new Sheet('photoSheet', ['backgroundBtn'], {
        onOpen: () => {
          this.scenery.renderSwatches();
          this.wallpaper.renderGrid(true);
        }
      }),
      settings: new Sheet('settingsSheet', ['settingsBtn'])
    };
    this.about = new Modal('aboutOverlay', { openers: ['aboutLink'] });

    // The site opens on search; #focus opens the timer
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setView(tab.dataset.view, { focusSearch: true }));
    });
    window.addEventListener('hashchange', () => this.setView(location.hash === '#focus' ? 'focus' : 'search'));
    this.setView(location.hash === '#focus' ? 'focus' : 'search', { focusSearch: canHover });

    History.render();
    Quotes.show();
    this.onTimerChange();

    document.getElementById('historyClearBtn')?.addEventListener('click', async () => {
      if (History.load().length === 0) return;
      if (await siteConfirm('Clear all history? This also resets your streak.')) History.clear();
    });
    document.getElementById('copyEmailBtn')?.addEventListener('click', (e) => this.copyEmail(e.currentTarget));

    this.zenBtn = document.getElementById('zenBtn');
    this.zenBtn?.addEventListener('click', () => this.toggleZen());
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.isZen) this.toggleZen(false);
    });
    this.renderZen();

    this.setupShortcuts();
    this.registerServiceWorker();

    // Browsers only allow sound after an interaction, so wake audio on the first one
    const unlock = () => AudioHub.get();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    // The day may have rolled over while the tab was in the background
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        History.render();
        this.tasks.renderSummary();
      }
    });
  }

  onTimerChange() {
    this.ambience?.sync();
    this.popout?.render();
  }

  setView(view, { focusSearch = false } = {}) {
    this.view = view === 'focus' ? 'focus' : 'search';
    const app = document.getElementById('app');
    app?.classList.toggle('view-search', this.view === 'search');
    app?.classList.toggle('view-focus', this.view === 'focus');
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.view === this.view));
    });
    if (this.view === 'search' && this.isZen) this.toggleZen(false);
    const hash = this.view === 'focus' ? '#focus' : '';
    if (location.hash !== hash) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    if (this.view === 'search' && focusSearch) setTimeout(() => this.home.focus(), 50);
  }

  // A short note at the top of the screen; lead is set in italic display type
  toast(lead, text) {
    const zone = document.getElementById('toastZone');
    if (!zone) return;
    const el = document.createElement('div');
    el.className = 'toast';
    const em = document.createElement('em');
    em.textContent = lead;
    el.append(em, document.createTextNode(` ${text}`));
    zone.append(el);
    while (zone.children.length > 3) zone.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 450);
    }, 5000);
  }

  get isZen() {
    return document.getElementById('app')?.classList.contains('zen');
  }

  toggleZen(force) {
    const on = typeof force === 'boolean' ? force : !this.isZen;
    document.getElementById('app')?.classList.toggle('zen', on);
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    this.renderZen();
  }

  renderZen() {
    if (!this.zenBtn) return;
    const on = this.isZen;
    this.zenBtn.innerHTML = on ? ICONS.collapse : ICONS.expand;
    const label = on ? 'Leave zen mode (F)' : 'Zen mode (F)';
    this.zenBtn.title = label;
    this.zenBtn.setAttribute('aria-label', label);
  }

  async copyEmail(btn) {
    const email = document.getElementById('emailAddress')?.textContent.trim();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      const label = btn.textContent;
      btn.textContent = 'copied';
      setTimeout(() => { btn.textContent = label; }, 1500);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('emailAddress'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // System notification, only when the tab isn't visible
  notify(title, body) {
    if (!this.timer?.settings.notify || !document.hidden) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: '0bsidian-timer' };
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(() => {});
    } else {
      try { new Notification(title, options); } catch {}
    }
  }

  setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (document.querySelector('.overlay.open')) return;
      if (e.key === '/') {
        e.preventDefault();
        this.setView('search', { focusSearch: true });
        return;
      }
      if (this.view === 'search') {
        // On the search view, typing anywhere goes into the search bar (Space stays with
        // the focused button)
        if (e.key.length === 1 && e.key !== ' ' && !e.repeat && !document.querySelector('.sheet.open')) this.home.focus();
        return;
      }
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (e.code === 'Space') {
        if (e.target.closest?.('button, a')) return; // let the focused control handle it
        e.preventDefault();
        this.timer.toggle();
      } else if (key === 'r') {
        this.timer.confirmReset();
      } else if (key === 's') {
        this.timer.skip();
      } else if (key === 't') {
        this.sheets.tasks.toggle();
      } else if (key === 'f') {
        this.toggleZen();
      } else if (key === 'p') {
        this.popout.toggle();
      }
    });
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new App());
else new App();
