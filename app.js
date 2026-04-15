/**
 * 0bsidian Terminal Application
 */

const CONFIG = {
  aiHistoryKey: 'lt-ai-history',
  subtitleText: 'notes from a working physician',
  typingSpeedMs: 55,
  botName: '0bsidian',
  contactEmail: 'tarball.lipid_7i@icloud.com',
  portalUrl: 'https://start.lokeshtewari.uk'
};

function siteConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirmOverlay');
    const msg = document.getElementById('confirmMsg');
    const yesBtn = document.getElementById('confirmYes');
    const cancelBtn = document.getElementById('confirmCancel');
    if (!overlay || !msg) { resolve(confirm(message)); return; }

    msg.textContent = message;
    overlay.classList.add('open');

    const cleanup = (result) => {
      overlay.classList.remove('open');
      yesBtn.removeEventListener('click', onYes);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const onYes = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };

    yesBtn.addEventListener('click', onYes);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  });
}

class DOMUtils {
  static parseMarkdown(text) {
    const frag = document.createDocumentFragment();
    const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0, m;

    while ((m = re.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1] !== undefined) {
        const strong = document.createElement('strong');
        strong.textContent = m[1];
        frag.appendChild(strong);
      } else {
        const em = document.createElement('em');
        em.textContent = m[2];
        frag.appendChild(em);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }
}

class ChatClient {
  constructor() {
    this.conversation = [];
    this.isLoading = false;
    this.loadHistory();
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(CONFIG.aiHistoryKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) this.conversation = parsed;
      }
    } catch {}
  }

  saveHistory() {
    try { localStorage.setItem(CONFIG.aiHistoryKey, JSON.stringify(this.conversation)); } catch {}
  }

  clearMemory() {
    this.conversation = [];
    try { localStorage.removeItem(CONFIG.aiHistoryKey); } catch {}
  }

  pushUserMessage(content) { this.conversation.push({ role: 'user', content }); }
  pushAssistantMessage(content) { this.conversation.push({ role: 'assistant', content }); this.saveHistory(); }
  popLastMessage() { this.conversation.pop(); }
  getTurns() { return Math.floor(this.conversation.length / 2); }

  async ask() {
    this.isLoading = true;
    try {
      const token = window.appInstance?.turnstileToken;
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.conversation, turnstileToken: token })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server error');
      }
      const data = await res.json();
      if (!data.response) throw new Error('Empty response');
      return data.response;
    } finally {
      this.isLoading = false;
    }
  }
}

class TerminalUI {
  constructor() {
    this.elements = {
      terminal: document.getElementById('terminal'),
      output: document.getElementById('output'),
      input: document.getElementById('cmd-input'),
      body: document.getElementById('body'),
      caret: document.getElementById('caret'),
      host: document.getElementById('term-host'),
      badge: document.getElementById('term-badge'),
      prompt: document.getElementById('term-prompt')
    };
    this.history = [];
    this.historyIndex = -1;
    this.commands = this.getCommandRegistry();
    this.commandList = [...Object.keys(this.commands).map(c => '/' + c), '/forget', '/clear'];
    this.initEvents();
  }

  getCommandRegistry() {
    return {
      help: `available commands\n\n` +
            `/about       who this is\n` +
            `/now         current focus\n` +
            `/github      code & projects\n` +
            `/model       current AI model\n` +
            `/version     build info\n` +
            `/privacy     privacy details\n` +
            `/forget      clear ai memory\n` +
            `/clear       clear the screen\n\n` +
            `type any command and press enter.\nanything not starting with '/' is sent to 0bsidian AI.`,
      about: `lokesh tewari. mbbs.\ni diagnose, present, and occasionally get it right on the first try.\n\noff-hours: a proxmox homelab.\nmedicine and metasploit, in no particular order.\n\nbased in india.`,
      now: `· eating, sleeping, procrastinating.\n· currently: the emperor of all maladies.`,
      github: `github.com/0bsidian-bit\n\nprojects, dotfiles, and occasional proofs of concept.\nopen to collaboration — send a message first.`,
      whoami: '0bsidian-bit. a working physician. and you?',
      sudo: 'permission denied. nice try.',
      model: 'llama 3.3 70b fp8  ·  cloudflare workers ai',
      privacy: `your browser only. tasks, timers, chat history → localStorage.\nno analytics, no trackers, no cookies beyond turnstile.\nkv entries are ephemeral: rate-limit (60s), studying heartbeat (90s), turnstile verify (30m).\nsource: github.com/0bsidian-bit`,
      version: () => {
        const now = new Date();
        const month = now.toLocaleString('en-us', { month: 'long' }).toLowerCase();
        return `lokeshtewari.uk  v1.1.0\nbuilt      ${month} ${now.getFullYear()}\nruntime    cloudflare workers`;
      }
    };
  }

  initEvents() {
    if (!this.elements.input) return;

    this.elements.input.addEventListener('paste', e => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    this.elements.input.addEventListener('keydown', e => this.handleKeydown(e));

    this.elements.terminal?.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') {
        const sel = window.getSelection();
        if (!sel.toString()) this.elements.input.focus();
      }
    });
  }

  setAppInstance(app) { this.app = app; }

  handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = this.getInputValue().trim();
      if (val) { this.history.unshift(val); this.historyIndex = -1; }
      this.app.routeInput(val);
      this.clearInput();
      this.scrollDown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) this.setInputValue(this.history[++this.historyIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex > 0) this.setInputValue(this.history[--this.historyIndex]);
      else { this.historyIndex = -1; this.clearInput(); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const completed = this.autocomplete(this.getInputValue().trim());
      if (completed) this.setInputValue(completed);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      this.clearTerminal();
    }
  }

  autocomplete(partial) {
    if (!partial.startsWith('/')) return null;
    const matches = this.commandList.filter(c => c.startsWith(partial));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) { this.printLine(matches.join('   '), 'dim'); this.scrollDown(); }
    return null;
  }

  getInputValue() { return this.elements.input.textContent || ''; }
  setInputValue(text) {
    this.elements.input.textContent = text;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(this.elements.input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  clearInput() { this.elements.input.textContent = ''; }
  clearTerminal() {
    if (this.elements.output.replaceChildren) this.elements.output.replaceChildren();
    else this.elements.output.textContent = '';
  }
  scrollDown() { this.elements.body.scrollTop = this.elements.body.scrollHeight; }

  printLine(text, cls = '', markdown = false) {
    text.split('\n').forEach(line => {
      const div = document.createElement('div');
      div.className = 'line' + (cls ? ' ' + cls : '');
      if (markdown && line) div.appendChild(DOMUtils.parseMarkdown(line));
      else div.textContent = line || '\u00A0';
      this.elements.output.appendChild(div);
    });
  }

  printUserInput(cmd) {
    const div = document.createElement('div');
    div.className = 'line';
    const ps = document.createElement('span');
    ps.className = 'prompt';
    ps.textContent = '>';
    div.appendChild(ps);
    div.appendChild(document.createTextNode(cmd));
    this.elements.output.appendChild(div);
  }

  printBlank() {
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = '\u00A0';
    this.elements.output.appendChild(div);
  }

  printSeparator() {
    const div = document.createElement('div');
    div.className = 'line separator';
    this.elements.output.appendChild(div);
  }

  lockInput() { this.elements.input.contentEditable = 'false'; }
  unlockInput() { this.elements.input.contentEditable = 'true'; this.elements.input.focus(); }

  createSpinner() {
    const thinkDiv = document.createElement('div');
    thinkDiv.className = 'line ai-thinking';
    this.elements.output.appendChild(thinkDiv);
    this.scrollDown();
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let fi = 0;
    const interval = setInterval(() => { thinkDiv.textContent = frames[fi++ % frames.length] + ' thinking'; }, 80);
    return { remove: () => { clearInterval(interval); thinkDiv.remove(); } };
  }

  printUserAIMessage(query) {
    const userDiv = document.createElement('div');
    userDiv.className = 'line ai-user';
    const ps = document.createElement('span');
    ps.className = 'ai-who ai-who-user';
    ps.textContent = 'you';
    userDiv.appendChild(ps);
    userDiv.appendChild(document.createTextNode(query));
    this.elements.output.appendChild(userDiv);
  }

  printBotAIMessage(response) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'line ai-label';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'ai-who ai-who-bot';
    labelSpan.textContent = CONFIG.botName;
    labelDiv.appendChild(labelSpan);
    this.elements.output.appendChild(labelDiv);
    this.printLine(response, 'ai-response', true);
  }

  pauseCaret() {
    this.elements.caret.classList.add('paused');
    setTimeout(() => this.elements.caret.classList.remove('paused'), 2000);
  }
}

class PomoAudio {
  constructor() { this.ctx = null; }
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  playTick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.05);
  }
  playBell() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 2);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 2);
  }
}

const POMO_STATE_KEY = '0bsidian_pomo_state_v1';
const POMO_STATS_KEY = '0bsidian_pomo_stats';
const POMO_NAMES_KEY = '0bsidian_pomo_names_v1';
const POMO_SETTINGS_KEY = '0bsidian_pomo_settings_v1';
const POMO_CIRCUMFERENCE = 339.292;
const POMO_DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  tickingSound: false,
  bell: true,
};

class PomodoroTimer {
  constructor() {
    // Load settings first so modes are correct
    this.settings = { ...POMO_DEFAULT_SETTINGS };
    try {
      const saved = JSON.parse(localStorage.getItem(POMO_SETTINGS_KEY));
      if (saved && typeof saved === 'object') this.settings = { ...this.settings, ...saved };
    } catch {}

    this.modes = {
      pomodoro: this.settings.workDuration * 60,
      shortBreak: this.settings.shortBreakDuration * 60,
      longBreak: this.settings.longBreakDuration * 60,
    };
    this.currentMode = 'pomodoro';
    this.timeLeft = this.modes.pomodoro;
    this.isRunning = false;
    this.timerId = null;
    this.endsAt = null;
    this.baseTitle = document.title;

    let stats = { cycles: 0 };
    try { stats = JSON.parse(localStorage.getItem(POMO_STATS_KEY)) || stats; } catch {}
    this.totalCycles = stats.cycles;
    // position within current interval (0 = start of a new set)
    this.setInCount = this.totalCycles % this.settings.longBreakInterval;

    this.names = { pomodoro: 'focus', shortBreak: 'short', longBreak: 'long' };
    try {
      const saved = JSON.parse(localStorage.getItem(POMO_NAMES_KEY));
      if (saved && typeof saved === 'object') this.names = { ...this.names, ...saved };
    } catch {}

    this.audio = new PomoAudio();

    this.elements = {
      tabs: document.querySelectorAll('.pomo-tab'),
      time: document.getElementById('pomoTime'),
      progress: document.getElementById('pomoProgress'),
      nameDisplay: document.getElementById('pomoNameDisplay'),
      nameInput: document.getElementById('pomoNameInput'),
      toggleBtn: document.getElementById('pomoToggle'),
      resetBtn: document.getElementById('pomoReset'),
      cycleInfo: document.getElementById('pomoCycle'),
      cyclesWrap: document.getElementById('pomoCyclesWrap'),
      settingsBtn: document.getElementById('pomoSettingsBtn'),
      settingsMenu: document.getElementById('pomoSettingsMenu'),
      fullscreenBtn: document.getElementById('hubFullscreenBtn'),
      hub: document.getElementById('prodHub'),
      dashboard: document.getElementById('dashboardLayout')
    };

    if (this.elements.cycleInfo) this.elements.cycleInfo.textContent = this.totalCycles + 1;
    this.renderCycleDots();
    this.applySettingsToUI();

    this.initEvents();
    this.hydrateFromStorage();
    this.updateModeVisuals();
    this.updateDisplay();
    this.updateName();
  }

  applySettingsToUI() {
    const s = this.settings;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
    setVal('settingWorkDur', s.workDuration);       setTxt('settingWorkDurVal', s.workDuration);
    setVal('settingShortBreak', s.shortBreakDuration); setTxt('settingShortBreakVal', s.shortBreakDuration);
    setVal('settingLongBreak', s.longBreakDuration);   setTxt('settingLongBreakVal', s.longBreakDuration);
    setTxt('settingLongIntervalDisplay', s.longBreakInterval);
    setChk('settingAutoBreaks', s.autoStartBreaks);
    setChk('settingAutoPomodoros', s.autoStartPomodoros);
    setChk('settingTick', s.tickingSound);
    setChk('settingBell', s.bell);
  }

  saveSettings() {
    try { localStorage.setItem(POMO_SETTINGS_KEY, JSON.stringify(this.settings)); } catch {}
  }

  renderCycleDots() {
    const wrap = this.elements.cyclesWrap;
    if (!wrap) return;
    wrap.querySelectorAll('.pomo-tomato').forEach(d => d.remove());
    const interval = this.settings.longBreakInterval;
    for (let i = 0; i < interval; i++) {
      const dot = document.createElement('span');
      dot.className = 'pomo-tomato' + (i < this.setInCount ? ' active' : '');
      dot.title = `session ${i + 1} of ${interval}`;
      wrap.appendChild(dot);
    }
  }

  initEvents() {
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        if (this.isRunning) {
          if (!(await siteConfirm('Switch mode? This will reset the current timer.'))) return;
        }
        this.setMode(tab.dataset.mode);
      });
    });
    this.elements.toggleBtn?.addEventListener('click', () => this.toggle());
    this.elements.resetBtn?.addEventListener('click', async () => {
      if (this.isRunning || this.timeLeft < this.modes[this.currentMode]) {
        if (!(await siteConfirm('Reset the timer?'))) return;
      }
      this.reset();
    });
    this.elements.settingsBtn?.addEventListener('click', () => this.elements.settingsMenu?.classList.toggle('open'));

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
      if (this.elements.settingsMenu?.classList.contains('open') &&
          !this.elements.settingsMenu.contains(e.target) &&
          e.target !== this.elements.settingsBtn) {
        this.elements.settingsMenu.classList.remove('open');
      }
    });

    this.elements.nameInput?.addEventListener('input', (e) => {
      const v = (e.target.value || '').trim().slice(0, 20);
      this.names[this.currentMode] = v || this.defaultName(this.currentMode);
      try { localStorage.setItem(POMO_NAMES_KEY, JSON.stringify(this.names)); } catch {}
      this.updateName();
    });

    this.elements.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.elements.dashboard?.classList.contains('fullscreen')) {
        this.elements.dashboard.classList.remove('fullscreen');
        this.updateFullscreenLabel(false);
      }
    });

    // Duration sliders
    const bindSlider = (inputId, valId, settingKey, modeKey) => {
      const el = document.getElementById(inputId);
      const valEl = document.getElementById(valId);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseInt(el.value, 10);
        if (valEl) valEl.textContent = v;
        this.settings[settingKey] = v;
        this.saveSettings();
        this.modes[modeKey] = v * 60;
        if (!this.isRunning && this.currentMode === modeKey) {
          this.timeLeft = this.modes[modeKey];
          this.updateDisplay();
        }
      });
    };
    bindSlider('settingWorkDur',    'settingWorkDurVal',    'workDuration',       'pomodoro');
    bindSlider('settingShortBreak', 'settingShortBreakVal', 'shortBreakDuration', 'shortBreak');
    bindSlider('settingLongBreak',  'settingLongBreakVal',  'longBreakDuration',  'longBreak');

    // Long break interval +/−
    const intervalDisplay = document.getElementById('settingLongIntervalDisplay');
    const changeInterval = (delta) => {
      const v = Math.max(1, Math.min(10, this.settings.longBreakInterval + delta));
      this.settings.longBreakInterval = v;
      if (intervalDisplay) intervalDisplay.textContent = v;
      this.setInCount = Math.min(this.setInCount, v - 1);
      this.saveSettings();
      this.renderCycleDots();
    };
    document.getElementById('intervalDec')?.addEventListener('click', () => changeInterval(-1));
    document.getElementById('intervalInc')?.addEventListener('click', () => changeInterval(1));

    // Toggle switches
    const bindToggle = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => { this.settings[key] = el.checked; this.saveSettings(); });
    };
    bindToggle('settingAutoBreaks',    'autoStartBreaks');
    bindToggle('settingAutoPomodoros', 'autoStartPomodoros');
    bindToggle('settingTick',          'tickingSound');
    bindToggle('settingBell',          'bell');
  }

  toggleFullscreen() {
    const layout = this.elements.dashboard;
    if (!layout) return;
    const isFs = layout.classList.contains('fullscreen');
    if (!isFs) {
      layout.classList.add('fullscreen');
      this.updateFullscreenLabel(true);
      layout.requestFullscreen?.().catch(() => {});
    } else {
      layout.classList.remove('fullscreen');
      this.updateFullscreenLabel(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }

  updateFullscreenLabel(fs) {
    const btn = this.elements.fullscreenBtn;
    if (!btn) return;
    btn.querySelector('.hub-fs-icon').textContent = fs ? '✕' : '⛶';
    btn.querySelector('.hub-fs-label').textContent = fs ? 'exit' : 'focus';
  }

  defaultName(mode) {
    return mode === 'pomodoro' ? 'focus' : mode === 'shortBreak' ? 'short' : 'long';
  }

  updateName() {
    const name = this.names[this.currentMode] || this.defaultName(this.currentMode);
    if (this.elements.nameDisplay) this.elements.nameDisplay.textContent = name;
    if (this.elements.nameInput && this.elements.nameInput.value !== name) this.elements.nameInput.value = name;
  }


  setMode(mode, { autoStart = false, silent = false } = {}) {
    if (!this.modes[mode]) return;
    this.pause();
    this.currentMode = mode;
    this.timeLeft = this.modes[mode];

    this.elements.tabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`.pomo-tab[data-mode="${mode}"]`)?.classList.add('active');

    this.updateModeVisuals();
    this.updateDisplay();
    this.updateName();
    this.saveState();

    if (autoStart && !silent) this.start();
  }

  updateModeVisuals() {
    if (!this.elements.progress) return;
    if (this.currentMode === 'pomodoro') this.elements.progress.style.stroke = '';
    else this.elements.progress.style.stroke = '#5eead4';
  }

  toggle() {
    this.audio.init();
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning || this.timeLeft <= 0) return;
    this.isRunning = true;
    this.endsAt = Date.now() + this.timeLeft * 1000;
    this.elements.toggleBtn.textContent = '⏸';
    this.timerId = setInterval(() => this.tick(), 1000);
    this.saveState();
    if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(this.currentMode === 'pomodoro');
  }

  pause() {
    if (this.isRunning && this.endsAt) {
      this.timeLeft = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    }
    this.isRunning = false;
    this.endsAt = null;
    if (this.elements.toggleBtn) this.elements.toggleBtn.textContent = '▶';
    clearInterval(this.timerId);
    document.title = this.baseTitle;
    this.saveState();
    if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(false);
  }

  reset() {
    this.pause();
    this.timeLeft = this.modes[this.currentMode];
    this.updateDisplay();
    this.saveState();
  }

  tick() {
    this.timeLeft = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    this.updateDisplay();
    if (this.settings.tickingSound) this.audio.playTick();

    if (this.timeLeft <= 0) {
      this.onComplete();
    } else {
      if (this.timeLeft % 5 === 0) this.saveState();
    }
  }

  onComplete() {
    this.pause();
    if (this.settings.bell) this.audio.playBell();

    if (this.currentMode === 'pomodoro') {
      this.totalCycles++;
      this.setInCount++;
      try { localStorage.setItem(POMO_STATS_KEY, JSON.stringify({ cycles: this.totalCycles })); } catch {}
      if (this.elements.cycleInfo) this.elements.cycleInfo.textContent = this.totalCycles + 1;
      this.renderCycleDots();

      if (this.setInCount >= this.settings.longBreakInterval) {
        this.setMode('longBreak', { autoStart: this.settings.autoStartBreaks });
      } else {
        this.setMode('shortBreak', { autoStart: this.settings.autoStartBreaks });
      }
    } else {
      if (this.currentMode === 'longBreak') {
        this.setInCount = 0;
        this.renderCycleDots();
      }
      this.setMode('pomodoro', { autoStart: this.settings.autoStartPomodoros });
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (this.elements.time) this.elements.time.textContent = formatted;

    document.title = this.isRunning ? `(${formatted}) ${this.baseTitle}` : this.baseTitle;

    if (this.elements.progress) {
      const total = this.modes[this.currentMode];
      const percent = total > 0 ? this.timeLeft / total : 0;
      this.elements.progress.style.strokeDashoffset = -POMO_CIRCUMFERENCE * (1 - percent);
    }
  }

  saveState() {
    try {
      const payload = {
        mode: this.currentMode,
        timeLeft: this.timeLeft,
        isRunning: this.isRunning,
        endsAt: this.endsAt,
        savedAt: Date.now()
      };
      localStorage.setItem(POMO_STATE_KEY, JSON.stringify(payload));
    } catch {}
  }

  hydrateFromStorage() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem(POMO_STATE_KEY)); } catch {}
    if (!state || !this.modes[state.mode]) return;

    this.currentMode = state.mode;
    this.elements.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === this.currentMode));

    if (state.isRunning && typeof state.endsAt === 'number') {
      const remaining = Math.ceil((state.endsAt - Date.now()) / 1000);
      if (remaining > 0) {
        this.timeLeft = remaining;
        this.endsAt = state.endsAt;
        this.isRunning = true;
        if (this.elements.toggleBtn) this.elements.toggleBtn.textContent = '⏸';
        this.timerId = setInterval(() => this.tick(), 1000);
        if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(this.currentMode === 'pomodoro');
      } else {
        this.timeLeft = 0;
        this.onComplete();
      }
    } else {
      this.timeLeft = (typeof state.timeLeft === 'number' && state.timeLeft > 0) ? state.timeLeft : this.modes[this.currentMode];
    }
  }
}

const TODO_KEY = '0bsidian_todos_v2';

class TodoManager {
  constructor() {
    this.list = document.getElementById('todoList');
    this.input = document.getElementById('todoInput');
    this.color = document.getElementById('todoColor');
    this.addBtn = document.getElementById('todoAdd');

    this.subjects = [];
    try { this.subjects = JSON.parse(localStorage.getItem(TODO_KEY)) || []; } catch {}

    this.initEvents();
    this.render();
  }

  initEvents() {
    this.addBtn?.addEventListener('click', () => this.addSubject());
    this.input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.addSubject();
    });
  }

  addSubject() {
    const val = this.input.value.trim();
    if (!val) return;
    this.subjects.push({ id: Date.now(), subject: val, color: this.color.value, tasks: [] });
    this.input.value = '';
    this.save();
    this.render();
  }

  addTask(subjectId, text) {
    const subj = this.subjects.find(s => s.id === subjectId);
    if (!subj || !text.trim()) return;
    subj.tasks.push({ id: Date.now(), text: text.trim(), done: false });
    this.save();
    this.render();
  }

  toggleTask(subjectId, taskId) {
    const subj = this.subjects.find(s => s.id === subjectId);
    if (!subj) return;
    const task = subj.tasks.find(t => t.id === taskId);
    if (task) { task.done = !task.done; this.save(); this.render(); }
  }

  removeTask(subjectId, taskId) {
    const subj = this.subjects.find(s => s.id === subjectId);
    if (!subj) return;
    subj.tasks = subj.tasks.filter(t => t.id !== taskId);
    this.save();
    this.render();
  }

  removeSubject(subjectId) {
    this.subjects = this.subjects.filter(s => s.id !== subjectId);
    this.save();
    this.render();
  }

  save() { localStorage.setItem(TODO_KEY, JSON.stringify(this.subjects)); }

  topOpen(limit = 3) {
    const out = [];
    for (const s of this.subjects) {
      for (const t of s.tasks) {
        if (!t.done) out.push(`${s.subject}: ${t.text}`);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  render() {
    if (!this.list) return;
    this.list.replaceChildren();

    this.subjects.forEach(subj => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'todo-subject-group';

      const head = document.createElement('div');
      head.className = 'todo-subject-header';

      const headLeft = document.createElement('div');
      headLeft.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;';
      const colorDot = document.createElement('span');
      colorDot.className = 'todo-color-dot';
      colorDot.style.backgroundColor = subj.color;
      headLeft.appendChild(colorDot);
      headLeft.appendChild(document.createTextNode(' ' + subj.subject));

      const addTaskBtn = document.createElement('button');
      addTaskBtn.className = 'todo-add-task-btn';
      addTaskBtn.textContent = '+';
      addTaskBtn.title = 'Add task';
      addTaskBtn.onclick = (e) => {
        e.stopPropagation();
        const existing = groupDiv.querySelector('.todo-task-input-row');
        if (existing) { existing.remove(); return; }
        const row = document.createElement('div');
        row.className = 'todo-task-input-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'add task...';
        inp.className = 'todo-task-inline-input';
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' && inp.value.trim()) this.addTask(subj.id, inp.value);
          if (ev.key === 'Escape') row.remove();
        });
        row.appendChild(inp);
        head.after(row);
        inp.focus();
      };

      const delSubjBtn = document.createElement('button');
      delSubjBtn.className = 'todo-delete';
      delSubjBtn.textContent = '×';
      delSubjBtn.onclick = (e) => { e.stopPropagation(); this.removeSubject(subj.id); };

      head.appendChild(headLeft);
      head.appendChild(addTaskBtn);
      head.appendChild(delSubjBtn);
      groupDiv.appendChild(head);

      subj.tasks.forEach(t => {
        const item = document.createElement('div');
        item.className = `todo-item ${t.done ? 'done' : ''}`;

        const cb = document.createElement('div');
        cb.className = 'todo-checkbox';
        cb.textContent = t.done ? '✓' : '';
        cb.onclick = () => this.toggleTask(subj.id, t.id);

        const txt = document.createElement('div');
        txt.className = 'todo-text';
        txt.textContent = t.text;

        const del = document.createElement('button');
        del.className = 'todo-delete';
        del.textContent = '×';
        del.onclick = (e) => { e.stopPropagation(); this.removeTask(subj.id, t.id); };

        item.appendChild(cb);
        item.appendChild(txt);
        item.appendChild(del);
        groupDiv.appendChild(item);
      });

      this.list.appendChild(groupDiv);
    });
  }
}

const BUDDY_KEY = '0bsidian_pet_id';

class StudyCompanion {
  constructor(todo) {
    this.todo = todo;
    this.container = document.querySelector('.study-companion');
    this.artEl = document.getElementById('companionArt');
    this.speechEl = document.getElementById('companionSpeech');
    if (!this.artEl || !this.container) return;

    this.buddies = [
      { id: 1, name: 'Apollo', art: "  __\n<(o )___\n ( ._> /\n  `---'", personality: 'clingy', effect: 'flash' },
      { id: 2, name: 'Hermes', art: " .-. \n(o o)\n| O \\\n \\   \\\n  `~~~'", personality: 'chaotic', effect: 'blur-dash' },
      { id: 3, name: 'Athena', art: " ,___,\n [O.o]\n /)__)\n  \" \"", personality: 'stoic', effect: 'fade' },
      { id: 4, name: 'Artemis', art: " /\\_/\\\n( o.o )\n > ^ <", personality: 'shy', effect: 'shimmer' },
      { id: 5, name: 'Hephaestus', art: " [0_0]\n /| |\\\n  |_|", personality: 'shy', effect: 'pixelate' },
      { id: 6, name: 'Dionysus', art: "  ___\n (o o)\n(  _  )", personality: 'chaotic', effect: 'confetti-poof' },
      { id: 7, name: 'Hestia', art: "  .----.\n /      \\\n(   @  @ )\n \\  --  /\n  `----'", personality: 'clingy', effect: 'ember' },
      { id: 8, name: 'Ares', art: "  /\\\n (  )\n  \\/", personality: 'chaotic', effect: 'glitch' },
      { id: 9, name: 'Poseidon', art: "  ,-.\n (o o)\n /| |\\", personality: 'stoic', effect: 'ripple' },
      { id: 10, name: 'Zeus', art: " ^...^\n<_* *_>\n  \\_/", personality: 'stoic', effect: 'lightning' }
    ];

    let saved = localStorage.getItem(BUDDY_KEY);
    if (!saved) {
      saved = this.buddies[Math.floor(Math.random() * this.buddies.length)].id;
      localStorage.setItem(BUDDY_KEY, saved);
    }
    this.buddy = this.buddies.find(b => b.id == saved) || this.buddies[0];

    this.artEl.textContent = this.buddy.art;
    this.isWorking = false;
    this.thoughtTimer = null;
    this.lastMessage = `${this.buddy.name} here. ${this.personalityIntro()}`;

    this.side = Math.random() < 0.5 ? 'left' : 'right';
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.lastTeleportAt = 0;

    this.positionOnEdge();

    this.artEl.addEventListener('click', () => {
      this.say(this.lastMessage);
      this.teleport();
    });

    window.addEventListener('resize', () => this.positionOnEdge());
    window.addEventListener('mousemove', this.throttle((e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.reactToCursor();
    }, 200));

    setTimeout(() => this.say(this.lastMessage), 1500);
    this.scheduleNextTeleport();
  }

  personalityIntro() {
    const p = this.buddy.personality;
    if (p === 'clingy') return 'stay close, ok?';
    if (p === 'shy') return '...hi.';
    if (p === 'chaotic') return 'what trouble today?';
    return 'ready when you are.';
  }

  throttle(fn, ms) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn(...args); }
    };
  }

  positionOnEdge() {
    if (!this.container) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = this.container.offsetWidth || 80;
    const ch = this.container.offsetHeight || 100;

    const margin = 16;
    const x = this.side === 'left' ? margin : (vw - cw - margin);
    const ySafeTop = 120;
    const ySafeBottom = vh - ch - 80;
    const y = Math.max(ySafeTop, Math.min(ySafeBottom, ySafeTop + Math.random() * (ySafeBottom - ySafeTop)));

    this.container.style.position = 'fixed';
    this.container.style.transition = 'none';
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';
    this.container.dataset.side = this.side;
  }

  reactToCursor() {
    if (Date.now() - this.lastTeleportAt < 3000) return;
    const vw = window.innerWidth;
    const edgeThreshold = 140;
    const onLeftEdge = this.mouseX < edgeThreshold;
    const onRightEdge = this.mouseX > vw - edgeThreshold;
    const currentSide = this.side;
    const cursorSide = onLeftEdge ? 'left' : (onRightEdge ? 'right' : null);
    if (!cursorSide) return;

    const p = this.buddy.personality;
    if (p === 'clingy' && cursorSide !== currentSide) {
      this.side = cursorSide;
      this.teleport();
    } else if (p === 'shy' && cursorSide === currentSide) {
      this.side = cursorSide === 'left' ? 'right' : 'left';
      this.teleport();
    }
  }

  scheduleNextTeleport() {
    const p = this.buddy.personality;
    let min, max;
    if (p === 'clingy') { min = 45000; max = 90000; }
    else if (p === 'shy') { min = 180000; max = 360000; }
    else if (p === 'chaotic') { min = 30000; max = 120000; }
    else { min = 240000; max = 480000; } // stoic
    const next = min + Math.random() * (max - min);
    setTimeout(() => {
      if (this.buddy.personality === 'chaotic') this.side = this.side === 'left' ? 'right' : 'left';
      this.teleport();
      this.scheduleNextTeleport();
    }, next);
  }

  teleport() {
    if (!this.artEl) return;
    this.lastTeleportAt = Date.now();
    this.positionOnEdge();
    this.artEl.removeAttribute('data-effect');
    void this.artEl.offsetWidth;
    this.artEl.dataset.effect = this.buddy.effect;
    setTimeout(() => this.artEl?.removeAttribute('data-effect'), 900);
  }

  setWorkingState(working) {
    if (this.isWorking === working || !this.artEl) return;
    this.isWorking = working;

    if (working) {
      this.artEl.classList.add('working');
      clearInterval(this.thoughtTimer);
      this.fetchThought();
      const baseInterval = this.buddy.personality === 'clingy' ? 4 * 60 * 1000
                          : this.buddy.personality === 'stoic' ? 10 * 60 * 1000
                          : 6 * 60 * 1000;
      this.thoughtTimer = setInterval(() => this.fetchThought(), baseInterval);
    } else {
      this.artEl.classList.remove('working');
      clearInterval(this.thoughtTimer);
    }
  }

  async fetchThought() {
    let pomoStats = 0;
    try { pomoStats = (JSON.parse(localStorage.getItem(POMO_STATS_KEY)) || {}).cycles || 0; } catch {}

    let tasksDone = 0, totalTasks = 0;
    const topTasks = (this.todo?.topOpen(3) || []).join(' | ');
    try {
      const subjects = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
      subjects.forEach(s => { totalTasks += s.tasks.length; tasksDone += s.tasks.filter(t => t.done).length; });
    } catch {}

    const timer = window.appInstance?.pomodoro;
    const mode = timer ? (timer.currentMode === 'pomodoro' ? 'work' : 'break') : 'work';

    try {
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.buddy.name,
          personality: this.buddy.personality,
          mode,
          stats: `${pomoStats} pomodoros done, ${tasksDone}/${totalTasks} tasks complete`,
          topTasks
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) this.say(data.response);
      }
    } catch {}
  }

  say(text) {
    if (!this.speechEl) return;
    this.lastMessage = text;
    this.speechEl.textContent = text;
    this.speechEl.classList.add('show');
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.speechEl.classList.remove('show'), 12000);
  }
}

class TailscaleOverlay {
  constructor() {
    this.overlay = document.getElementById('tailscaleOverlay');
    this.initEvents();
  }

  initEvents() {
    document.getElementById('loginPill')?.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
    document.getElementById('tsCancel')?.addEventListener('click', () => this.close());
    document.getElementById('tsConfirm')?.addEventListener('click', () => { window.location.href = CONFIG.portalUrl; });

    this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this.close();
    });
  }

  open() { this.overlay?.classList.add('open'); this.overlay?.setAttribute('aria-hidden', 'false'); }
  close() { this.overlay?.classList.remove('open'); this.overlay?.setAttribute('aria-hidden', 'true'); }
}

class ContactModal {
  constructor() {
    this.overlay = document.getElementById('contactOverlay');
    this.form = document.getElementById('contactForm');
    this.initEvents();
  }

  initEvents() {
    document.getElementById('footerContactLink')?.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
    document.getElementById('contactCancel')?.addEventListener('click', () => this.close());
    document.getElementById('copyEmailBtn')?.addEventListener('click', () => this.copyEmail());

    this.form?.addEventListener('submit', (e) => { e.preventDefault(); this.sendMailto(); });

    this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this.close();
    });
  }

  open() {
    this.overlay?.classList.add('open');
    this.overlay?.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('contactName')?.focus(), 100);
  }
  close() { this.overlay?.classList.remove('open'); this.overlay?.setAttribute('aria-hidden', 'true'); }

  async copyEmail() {
    try {
      await navigator.clipboard.writeText(CONFIG.contactEmail);
      const btn = document.getElementById('copyEmailBtn');
      if (btn) { const o = btn.textContent; btn.textContent = 'copied ✓'; setTimeout(() => btn.textContent = o, 1500); }
    } catch {
      prompt('Copy this email:', CONFIG.contactEmail);
    }
  }

  sendMailto() {
    const name = document.getElementById('contactName').value.trim();
    const from = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim() || 'Hello from 0bsidian';
    const message = document.getElementById('contactMessage').value.trim();
    if (!name || !message) return;

    const body = `${message}\n\n— ${name}${from ? `\nReply: ${from}` : ''}`;
    const url = `mailto:${encodeURIComponent(CONFIG.contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setTimeout(() => this.close(), 300);
  }
}

class PrivacyOverlay {
  constructor() {
    this.overlay = document.getElementById('privacyOverlay');
    document.getElementById('footerPrivacyLink')?.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
    document.getElementById('privacyClose')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this.close();
    });
  }
  open() { this.overlay?.classList.add('open'); this.overlay?.setAttribute('aria-hidden', 'false'); }
  close() { this.overlay?.classList.remove('open'); this.overlay?.setAttribute('aria-hidden', 'true'); }
}

class InstallHint {
  constructor() {
    this.btn = document.getElementById('installHint');
    this.deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e;
      if (this.btn) this.btn.hidden = false;
    });
    this.btn?.addEventListener('click', async () => {
      if (!this.deferred) { this.btn.hidden = true; return; }
      this.deferred.prompt();
      await this.deferred.userChoice;
      this.deferred = null;
      this.btn.hidden = true;
    });
    window.addEventListener('appinstalled', () => { if (this.btn) this.btn.hidden = true; });
  }
}

class TerminalApp {
  constructor() {
    document.documentElement.setAttribute('data-theme', 'dark');
    this.chatClient = new ChatClient();
    this.ui = new TerminalUI();
    this.todo = new TodoManager();
    this.pomodoro = new PomodoroTimer();
    this.tailscale = new TailscaleOverlay();
    this.companion = new StudyCompanion(this.todo);
    this.contact = new ContactModal();
    this.privacy = new PrivacyOverlay();
    this.install = new InstallHint();

    this.ui.setAppInstance(this);

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => this.boot());
    else this.boot();
  }

  boot() {
    window.appInstance = this;
    window.scrollTo(0, 0);

    this.turnstileToken = null;
    this.turnstileWidgetId = null;

    this.animateHeroSubtitle();
    setTimeout(() => this.bootTerminalEnvironment(), 450);
    this.startHeartbeat();
    this.startStudyingCounter();
    this.setupChatScroll();
    this.setupTurnstile();
    this.registerServiceWorker();

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  setupChatScroll() {
    const btn = document.getElementById('chatScrollBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const terminal = document.getElementById('terminal');
      if (terminal) {
        terminal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => this.ui.elements.input?.focus(), 600);
      }
    });
  }

  setupTurnstile() {
    const wrap = document.getElementById('turnstileWrap');
    const widget = document.getElementById('turnstileWidget');
    if (!wrap || !widget) return;

    if (this.ui.elements.input) {
      this.ui.elements.input.setAttribute('contenteditable', 'false');
      this.ui.elements.input.dataset.placeholder = 'verify to chat...';
    }

    const renderWidget = () => {
      this.turnstileWidgetId = turnstile.render('#turnstileWidget', {
        sitekey: '0x4AAAAAAC88Z7mu7qgdM_2h',
        theme: 'dark',
        callback: (token) => {
          this.turnstileToken = token;
          wrap.classList.add('verified');
          if (this.ui.elements.input) {
            this.ui.elements.input.setAttribute('contenteditable', 'true');
            this.ui.elements.input.dataset.placeholder = '';
          }
          this.ui.printLine('✓ verified — you can chat now', 'ai-system');
          this.ui.printBlank();
          this.ui.elements.input?.focus();
        },
        'error-callback': () => {
          this.ui.printLine('verification failed — refresh to try again', 'ai-error');
        }
      });
    };

    if (typeof turnstile !== 'undefined') {
      renderWidget();
    } else {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (typeof turnstile !== 'undefined') { clearInterval(poll); renderWidget(); }
        else if (attempts >= 20) {
          clearInterval(poll);
          wrap.classList.add('verified');
          if (this.ui.elements.input) this.ui.elements.input.setAttribute('contenteditable', 'true');
        }
      }, 500);
    }
  }

  startHeartbeat() {
    const beat = () => fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    beat();
    setInterval(beat, 60000);
  }

  startStudyingCounter() {
    const el = document.getElementById('studyingCount');
    if (!el) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/studying');
        if (res.ok) {
          const data = await res.json();
          el.textContent = (typeof data.count === 'number') ? Math.max(1, data.count) : '—';
        } else {
          el.textContent = '—';
        }
      } catch {
        el.textContent = '—';
      }
    };
    poll();
    setInterval(poll, 15000);
  }

  animateHeroSubtitle() {
    const el = document.getElementById('hero-subtitle');
    if (!el) return;
    let i = 0;
    const interval = setInterval(() => {
      el.textContent = CONFIG.subtitleText.slice(0, ++i);
      if (i >= CONFIG.subtitleText.length) clearInterval(interval);
    }, CONFIG.typingSpeedMs);
  }

  bootTerminalEnvironment() {
    if (this.ui.elements.terminal) this.ui.elements.terminal.classList.add('ai-mode');
    if (this.ui.elements.host) this.ui.elements.host.textContent = '0bsidian-bit';
    if (this.ui.elements.badge) this.ui.elements.badge.textContent = '~ · zsh';
    if (this.ui.elements.prompt) this.ui.elements.prompt.textContent = '>';

    this.ui.clearTerminal();

    const turns = this.chatClient.getTurns();
    if (turns > 0) this.ui.printLine(`${turns} exchange${turns !== 1 ? 's' : ''} in memory  ·  /forget to clear`, 'ai-system');
    else this.ui.printLine('type naturally to chat with AI', 'ai-system');

    this.ui.printBlank();
  }

  routeInput(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    if (!cmd.startsWith('/')) { this.handleAIQuery(raw.trim()); return; }
    this.handleLocalCommand(cmd);
  }

  handleLocalCommand(cmd) {
    this.ui.printUserInput(cmd);

    if (cmd === '/clear') { this.ui.clearTerminal(); return; }
    if (cmd === '/forget') {
      this.chatClient.clearMemory();
      this.ui.printLine('memory cleared.', 'dim');
      this.ui.printBlank();
      return;
    }

    const parts = cmd.split(/\s+/);
    const key = parts[0].slice(1);
    const entry = this.ui.commands[key];

    if (entry === undefined) {
      this.ui.printLine(`command not found: ${cmd}`, 'dim');
      this.ui.printLine('type /help for the list', 'dim');
    } else if (typeof entry === 'string') {
      this.ui.printLine(entry);
    } else if (typeof entry === 'function') {
      this.ui.printLine(entry());
    }

    this.ui.printBlank();
  }

  async handleAIQuery(query) {
    if (!query || this.chatClient.isLoading) return;

    this.ui.lockInput();
    const isFirst = this.chatClient.conversation.length === 0;

    this.chatClient.pushUserMessage(query);

    if (!isFirst) this.ui.printSeparator();
    this.ui.printUserAIMessage(query);
    this.ui.printBlank();

    const spinner = this.ui.createSpinner();

    try {
      const response = await this.chatClient.ask();
      spinner.remove();
      this.ui.printBotAIMessage(response);
      this.chatClient.pushAssistantMessage(response);
    } catch (err) {
      spinner.remove();
      this.chatClient.popLastMessage();
      this.ui.printLine(`error: ${err.message}`, 'ai-error');
    } finally {
      this.ui.printBlank();
      this.ui.unlockInput();
      this.ui.scrollDown();
    }
  }
}

new TerminalApp();
