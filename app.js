/**
 * 0bsidian Terminal Application
 */

const CONFIG = {
  aiHistoryKey: 'lt-ai-history',
  chatThreadsKey: 'lt-chat-threads',
  subtitleText: 'notes from a working physician',
  typingSpeedMs: 55,
  typingDelayMs: 2500,
  botName: '0bsidian',
  contactEmail: 'tarball.lipid_7i@icloud.com',
  portalUrl: 'https://start.lokeshtewari.uk'
};

const ICONS = {
  play: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  send: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  install: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
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
    this.isLoading = false;
    this.threads = [];
    this.activeThreadId = null;
    this._loadThreads();
    if (this.threads.length === 0) this._createThread();
  }

  _loadThreads() {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_THREADS_KEY));
      if (Array.isArray(saved) && saved.length > 0) {
        this.threads = saved;
        this.activeThreadId = this.threads[0].id;
        return;
      }
    } catch {}
    // Migrate legacy flat history
    try {
      const legacy = JSON.parse(localStorage.getItem(CONFIG.aiHistoryKey));
      if (Array.isArray(legacy) && legacy.length > 0) {
        const thread = { id: Date.now(), title: 'previous chat', createdAt: Date.now(), messages: legacy };
        this.threads = [thread];
        this.activeThreadId = thread.id;
        this._saveThreads();
      }
    } catch {}
  }

  _saveThreads() {
    try { localStorage.setItem(CHAT_THREADS_KEY, JSON.stringify(this.threads)); } catch {}
  }

  _createThread() {
    const thread = { id: Date.now(), title: 'new chat', createdAt: Date.now(), messages: [] };
    this.threads.unshift(thread);
    if (this.threads.length > 10) this.threads.splice(10);
    this.activeThreadId = thread.id;
    this._saveThreads();
    return thread;
  }

  get activeThread() {
    return this.threads.find(t => t.id === this.activeThreadId) || this.threads[0];
  }

  get conversation() { return this.activeThread?.messages || []; }

  newThread() { this._createThread(); }

  switchThread(id) {
    const t = this.threads.find(t => t.id === id);
    if (t) this.activeThreadId = t.id;
  }

  clearAll() {
    this.threads = [];
    try { localStorage.removeItem(CHAT_THREADS_KEY); } catch {}
    this._createThread();
  }

  clearMemory() {
    const t = this.activeThread;
    if (t) { t.messages = []; this._saveThreads(); }
  }

  pushUserMessage(content) {
    const t = this.activeThread;
    if (!t) return;
    if (t.messages.length === 0) {
      t.title = content.slice(0, 28) + (content.length > 28 ? '…' : '');
    }
    t.messages.push({ role: 'user', content });
  }

  pushAssistantMessage(content) {
    const t = this.activeThread;
    if (!t) return;
    t.messages.push({ role: 'assistant', content });
    this._saveThreads();
  }

  popLastMessage() { this.activeThread?.messages.pop(); }
  getTurns() { return Math.floor((this.activeThread?.messages?.length || 0) / 2); }

  async ask() {
    this.isLoading = true;
    try {
      const token = window.appInstance?.turnstileToken;
      const messages = this.conversation.slice(-20);
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, turnstileToken: token })
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

class ChatUI {
  constructor() {
    this.messagesEl = document.getElementById('chatMessages');
    this.input = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('chatSendBtn');
    this.typingIndicator = null;
    this.isLocked = true; // locked until Turnstile verified
    this.initEvents();
    if (this.sendBtn) this.sendBtn.innerHTML = ICONS.send;
  }

  setAppInstance(app) {
    this.app = app;
    document.getElementById('chatNewThread')?.addEventListener('click', () => {
      this.app.chatClient.newThread();
      this.clearMessages();
      this.renderSidebar();
    });
    document.getElementById('chatClearAll')?.addEventListener('click', async () => {
      const ok = await siteConfirm('clear all chat history?');
      if (!ok) return;
      this.app.chatClient.clearAll();
      this.clearMessages();
      this.renderSidebar();
    });
  }

  initEvents() {
    this.sendBtn?.addEventListener('click', () => this.submitInput());
    this.input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submitInput(); }
    });
  }

  renderSidebar() {
    const list = document.getElementById('chatThreadList');
    if (!list || !this.app) return;
    list.replaceChildren();
    this.app.chatClient.threads.forEach(thread => {
      const btn = document.createElement('button');
      btn.className = 'chat-thread-item';
      if (thread.id === this.app.chatClient.activeThreadId) btn.classList.add('active');
      btn.textContent = thread.title || 'untitled';
      btn.title = thread.title;
      btn.addEventListener('click', () => {
        this.app.chatClient.switchThread(thread.id);
        this.clearMessages();
        this._replayThread(this.app.chatClient.activeThread);
        this.renderSidebar();
      });
      list.appendChild(btn);
    });
  }

  _replayThread(thread) {
    if (!thread?.messages) return;
    thread.messages.forEach(msg => {
      if (msg.role === 'user') this.appendUserMessage(msg.content);
      else if (msg.role === 'assistant') this.appendAIMessage(msg.content);
    });
  }

  submitInput() {
    if (this.isLocked) return;
    const val = this.input?.value.trim();
    if (!val) return;
    if (this.input) this.input.value = '';
    this.app.handleAIQuery(val);
  }

  appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--user';
    msg.textContent = text;
    this.messagesEl?.appendChild(msg);
    this.scrollDown();
  }

  appendAIMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--ai';
    msg.appendChild(DOMUtils.parseMarkdown(text));
    this.messagesEl?.appendChild(msg);
    this.scrollDown();
    this.renderSidebar();
  }

  appendSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--system';
    msg.textContent = text;
    this.messagesEl?.appendChild(msg);
    this.scrollDown();
  }

  showTypingIndicator() {
    const ind = document.createElement('div');
    ind.className = 'chat-msg chat-msg--ai chat-typing';
    ind.innerHTML = '<span></span><span></span><span></span>';
    this.messagesEl?.appendChild(ind);
    this.typingIndicator = ind;
    this.scrollDown();
    return { remove: () => ind.remove() };
  }

  scrollDown() {
    if (this.messagesEl) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  lockInput() {
    this.isLocked = true;
    if (this.input) { this.input.disabled = true; this.input.placeholder = 'verify to chat…'; }
  }

  unlockInput() {
    this.isLocked = false;
    if (this.input) { this.input.disabled = false; this.input.placeholder = 'type to chat…'; this.input.focus(); }
  }

  clearMessages() {
    if (this.messagesEl) this.messagesEl.replaceChildren();
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
    const t = this.ctx.currentTime;
    // High transient click
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1200, t);
    osc1.frequency.exponentialRampToValueAtTime(400, t + 0.012);
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    osc1.connect(gain1); gain1.connect(this.ctx.destination);
    osc1.start(t); osc1.stop(t + 0.018);
    // Low thud body
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, t);
    osc2.frequency.exponentialRampToValueAtTime(80, t + 0.04);
    gain2.gain.setValueAtTime(0.06, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc2.connect(gain2); gain2.connect(this.ctx.destination);
    osc2.start(t); osc2.stop(t + 0.04);
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

  playAmbient() {
    if (!this.ctx) return;
    [200, 250, 310].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 3);
    });
  }
}

const POMO_STATE_KEY = '0bsidian_pomo_state_v1';
const POMO_STATS_KEY = '0bsidian_pomo_stats';
const POMO_NAMES_KEY = '0bsidian_pomo_names_v1';
const POMO_SETTINGS_KEY = '0bsidian_pomo_settings_v1';
const POMO_LOG_KEY = '0bsidian_pomo_log_v1';
const POMO_CIRCUMFERENCE = 439.823;
const POMO_SOUND_KEY = '0bsidian_sound_enabled';
const POMO_TIMER_MODE_KEY = '0bsidian_timer_mode';
const BREAK_TAGS_KEY = '0bsidian_break_tags_v1';
const CHAT_THREADS_KEY = 'lt-chat-threads';
const POMO_DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreakDuration: 5,
  tickingSound: false,
  bell: true,
};

class PomodoroTimer {
  constructor() {
    this.settings = { ...POMO_DEFAULT_SETTINGS };
    try {
      const saved = JSON.parse(localStorage.getItem(POMO_SETTINGS_KEY));
      if (saved && typeof saved === 'object') this.settings = { ...this.settings, ...saved };
    } catch {}

    this.modes = {
      pomodoro: this.settings.workDuration * 60,
      shortBreak: this.settings.shortBreakDuration * 60,
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

    this.names = { pomodoro: 'focus', shortBreak: 'rest' };
    try {
      const saved = JSON.parse(localStorage.getItem(POMO_NAMES_KEY));
      if (saved && typeof saved === 'object') this.names = { ...this.names, ...saved };
    } catch {}

    // Sound master toggle
    this.soundEnabled = true;
    try { const s = localStorage.getItem(POMO_SOUND_KEY); if (s !== null) this.soundEnabled = s !== 'false'; } catch {}

    // Timer mode: 'focus' (count-up) or 'pomodoro' (countdown)
    this.timerMode = 'focus';
    try { const m = localStorage.getItem(POMO_TIMER_MODE_KEY); if (m === 'pomodoro' || m === 'focus') this.timerMode = m; } catch {}

    // Focus mode state
    this.focusElapsed = 0;
    this.breakElapsed = 0;
    this.focusPhase = 'idle'; // 'idle' | 'working' | 'breaking'
    this.focusTimerId = null;
    this._currentSessionName = null;
    this.todo = null; // wired up by TerminalApp after construction

    this.audio = new PomoAudio();

    this.elements = {
      tabs: document.querySelectorAll('.pomo-tab'),
      subtabs: document.getElementById('pomoSubtabs'),
      time: document.getElementById('pomoTime'),
      progress: document.getElementById('pomoProgress'),
      nameDisplay: document.getElementById('pomoNameDisplay'),
      toggleBtn: document.getElementById('pomoToggle'),
      resetBtn: document.getElementById('pomoReset'),
      soundBtn: document.getElementById('pomoSound'),
      cycleInfo: document.getElementById('pomoCycle'),
      cyclesWrap: document.getElementById('pomoCyclesWrap'),
      settingsBtn: document.getElementById('pomoSettingsBtn'),
      settingsMenu: document.getElementById('pomoSettingsMenu'),
      fullscreenBtn: document.getElementById('hubFullscreenBtn'),
      hub: document.getElementById('prodHub'),
      dashboard: document.getElementById('dashboardLayout'),
      pomoCard: document.getElementById('pomodoroCard'),
      focusDisplay: document.getElementById('pomoFocusDisplay'),
      focusTimeDisplay: document.getElementById('focusTimeDisplay'),
      focusPhaseLabel: document.getElementById('focusPhaseLabel'),
    };

    if (this.elements.cycleInfo) this.elements.cycleInfo.textContent = this.totalCycles + 1;
    this.applySettingsToUI();
    this.initEvents();
    this.applyTimerModeUI();
    this.hydrateFromStorage();
    this.updateModeVisuals();
    this.updateDisplay();
    this.updateName();
    this.updateSoundBtn();

    // Set initial icon on toggle button
    this.updateToggleBtn();
    if (this.elements.resetBtn) this.elements.resetBtn.innerHTML = ICONS.reset;
    if (this.elements.settingsBtn) this.elements.settingsBtn.innerHTML = ICONS.settings;

    // Inline rename on timer name click
    this.elements.nameDisplay?.addEventListener('click', () => this.startInlineRename());
  }

  applySettingsToUI() {
    const s = this.settings;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setVal('settingWorkDur', s.workDuration);       setTxt('settingWorkDurVal', s.workDuration);
    setVal('settingShortBreak', s.shortBreakDuration); setTxt('settingShortBreakVal', s.shortBreakDuration);
  }

  saveSettings() {
    try { localStorage.setItem(POMO_SETTINGS_KEY, JSON.stringify(this.settings)); } catch {}
  }

  applyTimerModeUI() {
    const card = this.elements.pomoCard;
    if (!card) return;
    if (this.timerMode === 'focus') {
      card.classList.add('timer-mode--focus');
      card.classList.remove('timer-mode--pomodoro');
    } else {
      card.classList.add('timer-mode--pomodoro');
      card.classList.remove('timer-mode--focus');
    }
    // Update mode switch buttons
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.timerMode === this.timerMode);
    });
  }

  initEvents() {
    // Timer mode switch (Focus | Pomodoro)
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (this.isRunning || this.focusPhase !== 'idle') {
          if (!(await siteConfirm('Switch timer mode? This will stop the current session.'))) return;
        }
        this.switchTimerMode(btn.dataset.timerMode);
      });
    });

    // Pomodoro sub-tabs (focus/rest)
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
      if (this.timerMode === 'focus') {
        if (this.focusPhase !== 'idle') {
          if (!(await siteConfirm('Stop and reset the timer?'))) return;
        }
        this.resetFocus();
        return;
      }
      if (this.isRunning || this.timeLeft < this.modes[this.currentMode]) {
        if (!(await siteConfirm('Reset the timer?'))) return;
      }
      this.reset();
    });

    this.elements.soundBtn?.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      try { localStorage.setItem(POMO_SOUND_KEY, String(this.soundEnabled)); } catch {}
      this.updateSoundBtn();
    });

    this.elements.settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.settingsMenu?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (this.elements.settingsMenu?.classList.contains('open') &&
          !this.elements.settingsMenu.contains(e.target) &&
          e.target !== this.elements.settingsBtn) {
        this.elements.settingsMenu.classList.remove('open');
      }
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
  }

  updateSoundBtn() {
    if (!this.elements.soundBtn) return;
    this.elements.soundBtn.innerHTML = this.soundEnabled ? ICONS.soundOn : ICONS.soundOff;
    this.elements.soundBtn.title = this.soundEnabled ? 'Sound on' : 'Sound off';
  }

  updateToggleBtn() {
    const btn = this.elements.toggleBtn;
    if (!btn) return;
    if (this.timerMode === 'focus') {
      if (this.focusPhase === 'working') {
        btn.innerHTML = ICONS.pause;
        btn.title = 'End focus, start break';
      } else {
        btn.innerHTML = ICONS.play;
        btn.title = this.focusPhase === 'breaking' ? 'Resume focus' : 'Start';
      }
    } else {
      const hasStarted = this.timeLeft < this.modes[this.currentMode];
      if (this.isRunning) {
        btn.innerHTML = ICONS.pause;
        btn.title = 'Pause';
      } else if (hasStarted && this.timeLeft > 0) {
        btn.innerHTML = ICONS.play;
        btn.title = 'Resume';
      } else {
        btn.innerHTML = ICONS.play;
        btn.title = 'Start';
      }
    }
  }

  switchTimerMode(mode) {
    this.stopFocusTick();
    this.pause();
    this.focusPhase = 'idle';
    this.focusElapsed = 0;
    this.breakElapsed = 0;
    this.timerMode = mode;
    try { localStorage.setItem(POMO_TIMER_MODE_KEY, mode); } catch {}
    this.applyTimerModeUI();
    if (this.timerMode === 'focus') {
      this.updateFocusDisplay();
      this.updateToggleBtn();
    } else {
      this.updateDisplay();
      this.updateName();
    }
  }

  // ── Focus mode ──────────────────────────────────────────────────────────────

  async focusToggle() {
    this.audio.init();
    if (this.focusPhase === 'idle') {
      // Subject select prompt
      let sessionName = this.names.pomodoro || 'focus';
      const subjectModal = window.appInstance?.subjectSelectModal;
      if (subjectModal && this.todo?.subjects?.length > 0) {
        const chosen = await subjectModal.show();
        if (chosen) sessionName = chosen;
      }
      this._currentSessionName = sessionName;
      this.focusPhase = 'working';
      this.focusElapsed = 0;
      this.startFocusTick();
      this.updateToggleBtn();
      if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(true);
    } else if (this.focusPhase === 'working') {
      this.stopFocusTick();
      SessionLog.push({
        id: Date.now(),
        name: this._currentSessionName || this.names.pomodoro || 'focus',
        type: 'focus',
        completedAt: Date.now(),
        duration: Math.max(1, Math.round(this.focusElapsed / 60))
      });
      if (this.soundEnabled && this.settings.bell) this.audio.playBell();
      if (this.soundEnabled) setTimeout(() => this.audio.playAmbient(), 2200);
      this.focusPhase = 'breaking';
      this.breakElapsed = 0;
      this.startFocusTick();
      this.updateToggleBtn();
      if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(false);
    } else if (this.focusPhase === 'breaking') {
      this.stopFocusTick();
      const breakDur = Math.max(1, Math.round(this.breakElapsed / 60));
      const breakTagModal = window.appInstance?.breakTagModal;
      if (breakTagModal) {
        const tag = await breakTagModal.show(this.breakElapsed);
        if (tag !== null) {
          SessionLog.push({
            id: Date.now(), name: '#' + tag, type: 'break',
            completedAt: Date.now(), duration: breakDur
          });
        }
        // null = "don't record"
      } else {
        SessionLog.push({
          id: Date.now(), name: 'break', type: 'break',
          completedAt: Date.now(), duration: breakDur
        });
      }
      this.focusPhase = 'working';
      this.focusElapsed = 0;
      this.startFocusTick();
      if (this.soundEnabled && this.settings.bell) this.audio.playBell();
      this.updateToggleBtn();
      if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(true);
    }
  }

  startFocusTick() {
    clearInterval(this.focusTimerId);
    this.focusTimerId = setInterval(() => {
      if (this.focusPhase === 'working') {
        this.focusElapsed++;
        if (this.soundEnabled && this.settings.tickingSound) this.audio.playTick();
      } else if (this.focusPhase === 'breaking') {
        this.breakElapsed++;
      }
      this.updateFocusDisplay();
    }, 1000);
  }

  stopFocusTick() {
    clearInterval(this.focusTimerId);
    this.focusTimerId = null;
  }

  resetFocus() {
    this.stopFocusTick();
    this.focusPhase = 'idle';
    this.focusElapsed = 0;
    this.breakElapsed = 0;
    this.updateFocusDisplay();
    this.updateToggleBtn();
    document.title = this.baseTitle;
    if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(false);
  }

  updateFocusDisplay() {
    const formatHMS = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
    const elapsed = this.focusPhase === 'breaking' ? this.breakElapsed : this.focusElapsed;
    const label = this.focusPhase === 'breaking' ? 'break' : (this.focusPhase === 'working' ? (this.names.pomodoro || 'focus') : (this.names.pomodoro || 'focus'));
    if (this.elements.focusTimeDisplay) this.elements.focusTimeDisplay.textContent = formatHMS(elapsed);
    if (this.elements.focusPhaseLabel) this.elements.focusPhaseLabel.textContent = label;
    if (this.focusPhase !== 'idle') {
      document.title = `(${formatHMS(elapsed)}) ${this.baseTitle}`;
    } else {
      document.title = this.baseTitle;
    }
  }

  // ── Pomodoro mode ───────────────────────────────────────────────────────────

  toggleFullscreen() {
    const layout = this.elements.dashboard;
    if (!layout) return;
    const isFs = layout.classList.contains('fullscreen');
    if (!isFs) {
      layout.classList.add('fullscreen');
      this.updateFullscreenLabel(true);
      document.documentElement.requestFullscreen?.().catch(() => {});
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
    return mode === 'pomodoro' ? 'focus' : 'rest';
  }

  updateName() {
    const name = this.names[this.currentMode] || this.defaultName(this.currentMode);
    if (this.elements.nameDisplay) this.elements.nameDisplay.textContent = name;
  }

  startInlineRename() {
    const el = this.elements.nameDisplay;
    if (!el) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.names[this.currentMode] || this.defaultName(this.currentMode);
    input.className = 'pomo-inline-rename';
    input.maxLength = 20;
    el.replaceWith(input);
    input.focus(); input.select();
    const commit = () => {
      const v = input.value.trim() || this.defaultName(this.currentMode);
      this.names[this.currentMode] = v;
      try { localStorage.setItem(POMO_NAMES_KEY, JSON.stringify(this.names)); } catch {}
      input.replaceWith(el);
      this.elements.nameDisplay = el;
      this.updateName();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { input.blur(); }
      if (e.key === 'Escape') { input.replaceWith(el); this.elements.nameDisplay = el; }
    });
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
    else this.elements.progress.style.stroke = '#888888';
  }

  async toggle() {
    if (this.timerMode === 'focus') {
      await this.focusToggle();
      return;
    }
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
    this.updateToggleBtn();
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
    this.updateToggleBtn();
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
    if (this.soundEnabled && this.settings.tickingSound) this.audio.playTick();

    if (this.timeLeft <= 0) {
      this.onComplete();
    } else {
      if (this.timeLeft % 5 === 0) this.saveState();
    }
  }

  onComplete() {
    this.pause();
    if (this.soundEnabled && this.settings.bell) this.audio.playBell();

    if (this.currentMode === 'pomodoro') {
      this.totalCycles++;
      try { localStorage.setItem(POMO_STATS_KEY, JSON.stringify({ cycles: this.totalCycles })); } catch {}
      if (this.elements.cycleInfo) this.elements.cycleInfo.textContent = this.totalCycles + 1;
      SessionLog.push({ id: Date.now(), name: this.names.pomodoro || 'focus', type: 'pomodoro', completedAt: Date.now(), duration: this.settings.workDuration });
      this.setMode('shortBreak');
    } else {
      this.setMode('pomodoro');
    }
  }

  updateDisplay() {
    if (this.timerMode === 'focus') return;
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
        timerMode: this.timerMode,
        savedAt: Date.now()
      };
      localStorage.setItem(POMO_STATE_KEY, JSON.stringify(payload));
    } catch {}
  }

  hydrateFromStorage() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem(POMO_STATE_KEY)); } catch {}
    if (!state) return;

    // Restore timer mode
    if (state.timerMode === 'focus' || state.timerMode === 'pomodoro') {
      this.timerMode = state.timerMode;
    }

    // Restore pomodoro sub-mode (guard against removed longBreak)
    if (state.mode && this.modes[state.mode]) {
      this.currentMode = state.mode;
      this.elements.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === this.currentMode));
    }

    if (this.timerMode === 'pomodoro' && state.isRunning && typeof state.endsAt === 'number') {
      const remaining = Math.ceil((state.endsAt - Date.now()) / 1000);
      if (remaining > 0) {
        this.timeLeft = remaining;
        this.endsAt = state.endsAt;
        this.isRunning = true;
        this.updateToggleBtn();
        this.timerId = setInterval(() => this.tick(), 1000);
        if (window.appInstance?.companion) window.appInstance.companion.setWorkingState(this.currentMode === 'pomodoro');
      } else {
        this.timeLeft = 0;
        this.onComplete();
      }
    } else if (this.timerMode === 'pomodoro') {
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
    // Smart duration presets
    const pomo = window.appInstance?.pomodoro;
    if (pomo) {
      const lower = val.toLowerCase();
      if (lower.includes('uworld')) {
        pomo.settings.workDuration = 60;
        pomo.modes.pomodoro = 3600;
        pomo.saveSettings();
        const el = document.getElementById('settingWorkDur');
        const valEl = document.getElementById('settingWorkDurVal');
        if (el) el.value = 60;
        if (valEl) valEl.textContent = 60;
      } else if (lower.includes('first aid') || lower.includes('bootcamp')) {
        pomo.settings.workDuration = 25;
        pomo.modes.pomodoro = 1500;
        pomo.saveSettings();
        const el = document.getElementById('settingWorkDur');
        const valEl = document.getElementById('settingWorkDurVal');
        if (el) el.value = 25;
        if (valEl) valEl.textContent = 25;
      }
    }
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

class SessionLog {
  static MAX = 100;

  static load() {
    try { return JSON.parse(localStorage.getItem(POMO_LOG_KEY)) || []; } catch { return []; }
  }

  static save(log) {
    try { localStorage.setItem(POMO_LOG_KEY, JSON.stringify(log)); } catch {}
  }

  static push(entry) {
    const log = this.load();
    log.unshift(entry);
    if (log.length > this.MAX) log.splice(this.MAX);
    this.save(log);
    this.render();
  }

  static fmtTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return t;
    if (isYesterday) return `yesterday ${t}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + t;
  }

  static render() {
    const container = document.getElementById('sessionLog');
    const countEl = document.getElementById('sessionLogCount');
    if (!container) return;
    const log = this.load();
    if (countEl) countEl.textContent = log.length;

    container.replaceChildren();

    if (log.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'session-empty';
      empty.textContent = 'completed pomodoros will appear here';
      container.appendChild(empty);
      return;
    }

    log.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'session-item';

      const dot = document.createElement('span');
      dot.className = 'session-dot';

      const nameEl = document.createElement('span');
      nameEl.className = 'session-name';
      nameEl.textContent = entry.name;
      nameEl.title = 'click to rename';
      nameEl.onclick = () => this.startRename(entry.id, nameEl, log);

      const meta = document.createElement('span');
      meta.className = 'session-meta';
      meta.textContent = `${entry.duration}m · ${this.fmtTime(entry.completedAt)}`;

      const del = document.createElement('button');
      del.className = 'session-delete pop-btn';
      del.textContent = '×';
      del.title = 'Remove';
      del.onclick = () => this.delete(entry.id);

      item.append(dot, nameEl, meta, del);
      container.appendChild(item);
    });
  }

  static startRename(id, nameEl, log) {
    const entry = log.find(e => e.id === id);
    if (!entry) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'session-rename-input';
    input.value = entry.name;
    input.maxLength = 40;
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    const commit = () => {
      const val = input.value.trim();
      if (val) { entry.name = val; this.save(log); }
      this.render();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') this.render();
    });
  }

  static delete(id) {
    this.save(this.load().filter(e => e.id !== id));
    this.render();
  }

  static clear() {
    this.save([]);
    this.render();
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
      { id: 1, name: 'Apollo', art: "  __\n<(o )___\n ( ._> /\n  `---'", personality: 'focused', effect: 'flash' },
      { id: 2, name: 'Hermes', art: " .-. \n(o o)\n| O \\\n \\   \\\n  `~~~'", personality: 'energetic', effect: 'blur-dash' },
      { id: 3, name: 'Athena', art: " ,___,\n [O.o]\n /)__)\n  \" \"", personality: 'strategic', effect: 'fade' },
      { id: 4, name: 'Artemis', art: " /\\_/\\\n( o.o )\n > ^ <", personality: 'calm', effect: 'shimmer' },
      { id: 5, name: 'Hephaestus', art: " [0_0]\n /| |\\\n  |_|", personality: 'methodical', effect: 'pixelate' },
      { id: 6, name: 'Dionysus', art: "  ___\n (o o)\n(  _  )", personality: 'creative', effect: 'confetti-poof' },
      { id: 7, name: 'Hestia', art: "  .----.\n /      \\\n(   @  @ )\n \\  --  /\n  `----'", personality: 'nurturing', effect: 'ember' },
      { id: 8, name: 'Ares', art: "  /\\\n (  )\n  \\/", personality: 'driven', effect: 'glitch' },
      { id: 9, name: 'Poseidon', art: "  ,-.\n (o o)\n /| |\\", personality: 'analytical', effect: 'ripple' },
      { id: 10, name: 'Zeus', art: " ^...^\n<_* *_>\n  \\_/", personality: 'decisive', effect: 'lightning' }
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
    if (p === 'focused') return "deep work mode. let's go.";
    if (p === 'energetic') return "energy is high. let's crush this.";
    if (p === 'strategic') return 'plan first. execute cleanly.';
    if (p === 'calm') return "take a breath. you're doing great.";
    if (p === 'methodical') return 'one task at a time. steady.';
    if (p === 'creative') return 'think different. ideas are waiting.';
    if (p === 'nurturing') return "you've got this. I'm rooting for you.";
    if (p === 'driven') return 'no distractions. push through.';
    if (p === 'analytical') return 'data says: focus time is now.';
    if (p === 'decisive') return 'decide. act. move forward.';
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
    // Companion lives in the topbar — clear any stale inline styles
    if (this.container) this.container.removeAttribute('style');
  }

  reactToCursor() {
    // Buddy is fixed at top-left — no cursor-based movement
  }

  scheduleNextTeleport() {
    const p = this.buddy.personality;
    let min, max;
    if (p === 'energetic' || p === 'driven') { min = 45000; max = 90000; }
    else if (p === 'creative') { min = 60000; max = 180000; }
    else if (p === 'calm' || p === 'methodical' || p === 'nurturing') { min = 120000; max = 240000; }
    else { min = 240000; max = 480000; } // focused, strategic, analytical, decisive
    const next = min + Math.random() * (max - min);
    setTimeout(() => {
      if (p === 'energetic' || p === 'creative') this.side = this.side === 'left' ? 'right' : 'left';
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
      const p = this.buddy.personality;
      const baseInterval = (p === 'energetic' || p === 'driven') ? 4 * 60 * 1000
                          : (p === 'focused' || p === 'strategic' || p === 'analytical' || p === 'decisive') ? 10 * 60 * 1000
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

class DevMsgOverlay {
  constructor() {
    this.overlay = document.getElementById('devMsgOverlay');
    this.body = document.getElementById('devMsgBody');
    this.loaded = false;
    document.getElementById('devMsgClose')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this.close();
    });
  }
  open() {
    this.overlay?.classList.add('open');
    this.overlay?.setAttribute('aria-hidden', 'false');
    if (!this.loaded) this.fetchMessage();
  }
  close() {
    this.overlay?.classList.remove('open');
    this.overlay?.setAttribute('aria-hidden', 'true');
  }
  async fetchMessage() {
    if (!this.body) return;
    this.body.innerHTML = '<p style="color:var(--term-dimmer);font-style:italic;">loading…</p>';
    try {
      const res = await fetch('https://raw.githubusercontent.com/0bsidian-bit/landing-page/main/message.md');
      if (!res.ok) throw new Error(`${res.status}`);
      const md = await res.text();
      this.body.innerHTML = this.parseMarkdown(md);
      this.loaded = true;
    } catch (err) {
      this.body.innerHTML = '<p style="color:var(--term-dimmer);">could not load message. check back later.</p>';
    }
  }
  parseMarkdown(md) {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^## (.+)$/gm, '<h3 style="margin:1em 0 .3em;font-size:1em;color:var(--accent)">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="margin:1em 0 .3em;font-size:1.1em;color:var(--accent)">$1</h2>')
      .replace(/^---$/gm, '<hr style="border-color:var(--term-divider);margin:1em 0">')
      .split(/\n\n+/)
      .map(block => block.startsWith('<') ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }
}

class BreakTagModal {
  constructor() {
    this.overlay = document.getElementById('breakTagOverlay');
    this.tagGrid = document.getElementById('breakTagGrid');
    this.durationText = document.getElementById('breakDurationText');
    this._resolve = null;
    this.tags = this._loadTags();
    this._renderTags();
    document.getElementById('breakTagSkip')?.addEventListener('click', () => this._pick(null));
    document.getElementById('breakTagEdit')?.addEventListener('click', () => this._editTags());
    this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this._pick(null); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this._pick(null);
    });
  }

  _loadTags() {
    try {
      const saved = JSON.parse(localStorage.getItem(BREAK_TAGS_KEY));
      if (Array.isArray(saved) && saved.length >= 2) return saved;
    } catch {}
    return ['meals', 'bathroom', 'rest', 'other'];
  }

  _saveTags() {
    try { localStorage.setItem(BREAK_TAGS_KEY, JSON.stringify(this.tags)); } catch {}
  }

  _renderTags() {
    if (!this.tagGrid) return;
    this.tagGrid.replaceChildren();
    this.tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'break-tag-btn pop-btn';
      btn.textContent = '#' + tag;
      btn.addEventListener('click', () => this._pick(tag));
      this.tagGrid.appendChild(btn);
    });
  }

  show(breakDurationSecs) {
    return new Promise(resolve => {
      this._resolve = resolve;
      const h = Math.floor(breakDurationSecs / 3600);
      const m = Math.floor((breakDurationSecs % 3600) / 60);
      const s = breakDurationSecs % 60;
      const parts = [];
      if (h) parts.push(`${h}h`);
      if (m) parts.push(`${m}m`);
      if (s || !parts.length) parts.push(`${s}s`);
      if (this.durationText) this.durationText.textContent = 'break for ' + parts.join(' ');
      this.overlay?.classList.add('open');
      this.overlay?.setAttribute('aria-hidden', 'false');
    });
  }

  _pick(tag) {
    this.overlay?.classList.remove('open');
    this.overlay?.setAttribute('aria-hidden', 'true');
    if (this._resolve) { this._resolve(tag); this._resolve = null; }
  }

  async _editTags() {
    const newTags = [];
    for (let i = 0; i < this.tags.length; i++) {
      const val = prompt(`rename #${this.tags[i]}:`, this.tags[i]);
      newTags.push((val || this.tags[i]).trim().replace(/\s+/g, '-').toLowerCase().slice(0, 20));
    }
    this.tags = newTags;
    this._saveTags();
    this._renderTags();
  }
}

class SubjectSelectModal {
  constructor(todoManager) {
    this.todo = todoManager;
    this.overlay = document.getElementById('subjectSelectOverlay');
    this.list = document.getElementById('subjectSelectList');
    this._resolve = null;
    document.getElementById('subjectSelectSkip')?.addEventListener('click', () => this._pick(null));
    this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this._pick(null); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this._pick(null);
    });
  }

  show() {
    return new Promise(resolve => {
      this._resolve = resolve;
      if (!this.list) { resolve(null); return; }
      const subjects = this.todo?.subjects || [];
      if (subjects.length === 0) { resolve(null); return; }
      this.list.replaceChildren();
      subjects.forEach(subj => {
        const btn = document.createElement('button');
        btn.className = 'subject-select-btn pop-btn';
        const dot = document.createElement('span');
        dot.className = 'subject-select-dot';
        dot.style.backgroundColor = subj.color;
        btn.appendChild(dot);
        btn.appendChild(document.createTextNode(subj.subject));
        btn.addEventListener('click', () => this._pick(subj.subject));
        this.list.appendChild(btn);
      });
      this.overlay?.classList.add('open');
      this.overlay?.setAttribute('aria-hidden', 'false');
    });
  }

  _pick(name) {
    this.overlay?.classList.remove('open');
    this.overlay?.setAttribute('aria-hidden', 'true');
    if (this._resolve) { this._resolve(name); this._resolve = null; }
  }
}

class DevContactOverlay {
  constructor(contactModal) {
    this.overlay = document.getElementById('devContactOverlay');
    this.contactModal = contactModal;
    document.getElementById('footerDevName')?.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
    document.getElementById('devContactGetInTouch')?.addEventListener('click', () => {
      this.close();
      this.contactModal?.open();
    });
    document.getElementById('devContactGithub')?.addEventListener('click', () => {
      window.open('https://github.com/0bsidian-bit', '_blank', 'noopener');
    });
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
    if (this.btn) this.btn.innerHTML = ICONS.install;
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
    this.ui = new ChatUI();
    this.todo = new TodoManager();
    this.pomodoro = new PomodoroTimer();
    this.pomodoro.todo = this.todo;
    this.tailscale = new TailscaleOverlay();
    this.companion = new StudyCompanion(this.todo);
    this.contact = new ContactModal();
    this.privacy = new PrivacyOverlay();
    this.devMsg = new DevMsgOverlay();
    this.install = new InstallHint();
    this.breakTagModal = new BreakTagModal();
    this.subjectSelectModal = new SubjectSelectModal(this.todo);
    this.devContact = new DevContactOverlay(this.contact);

    this.ui.setAppInstance(this);

    // Session log: render on load and wire up clear button
    SessionLog.render();
    document.getElementById('sessionLogClear')?.addEventListener('click', () => SessionLog.clear());

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => this.boot());
    else this.boot();
  }

  boot() {
    window.appInstance = this;
    window.scrollTo(0, 0);

    this.turnstileToken = null;
    this.turnstileWidgetId = null;

    this.animateHeroSubtitle();
    this.startHeartbeat();
    this.startStudyingCounter();
    this.setupTabs();
    this.setupChatScroll();
    this.registerServiceWorker();

    // Warn before closing if timer is active
    window.addEventListener('beforeunload', (e) => {
      const pomo = window.appInstance?.pomodoro;
      if (pomo?.isRunning || (pomo?.focusPhase && pomo.focusPhase !== 'idle')) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.dash-tab');
    const studyPane = document.getElementById('dashStudyPane');
    const terminalPane = document.getElementById('dashTerminalPane');
    const whatsNewPane = document.getElementById('dashWhatsNewPane');
    if (!tabs.length || !studyPane || !terminalPane) return;

    let terminalReady = false;
    let whatsNewLoaded = false;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
        studyPane.classList.toggle('dash-pane--hidden', target !== 'study');
        terminalPane.classList.toggle('dash-pane--hidden', target !== 'terminal');
        if (whatsNewPane) whatsNewPane.classList.toggle('dash-pane--hidden', target !== 'whats-new');

        // Contextual settings: only visible on study tab
        const pomodoroCard = document.getElementById('pomodoroCard');
        if (pomodoroCard) pomodoroCard.classList.toggle('settings-hidden', target !== 'study');

        if (target === 'terminal') {
          if (!terminalReady) {
            terminalReady = true;
            this.setupTurnstile();
            const turns = this.chatClient.getTurns();
            if (turns > 0) {
              this.ui.appendSystemMessage(`${turns} exchange${turns !== 1 ? 's' : ''} in memory`);
            }
          }
          this.ui.renderSidebar();
          setTimeout(() => this.ui.input?.focus(), 150);
        }

        if (target === 'whats-new' && !whatsNewLoaded) {
          whatsNewLoaded = true;
          this.loadWhatsNew();
        }
      });
    });
  }

  loadWhatsNew() {
    const container = document.getElementById('whatsNewContent');
    if (!container) return;
    fetch('/updates.md')
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(md => { container.innerHTML = this._renderMarkdown(md); })
      .catch(err => {
        container.innerHTML = `<p class="whats-new-loading">could not load updates (${err}).</p>`;
      });
  }

  _renderMarkdown(md) {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^---$/gm, '<hr>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .split(/\n\n+/)
      .map(block => block.startsWith('<') ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  switchToTab(tab) {
    const tabBtn = document.querySelector(`.dash-tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.click();
  }

  setupChatScroll() {
    const btn = document.getElementById('chatScrollBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.switchToTab('terminal');
      const dashLayout = document.getElementById('dashboardLayout');
      if (dashLayout) dashLayout.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  setupTurnstile() {
    const wrap = document.getElementById('chatTurnstileWrap');
    const widget = document.getElementById('chatTurnstileWidget');
    if (!wrap || !widget) return;

    this.ui.lockInput();

    const renderWidget = () => {
      this.turnstileWidgetId = turnstile.render('#chatTurnstileWidget', {
        sitekey: '0x4AAAAAAC88Z7mu7qgdM_2h',
        theme: 'dark',
        callback: (token) => {
          this.turnstileToken = token;
          wrap.classList.add('verified');
          this.ui.unlockInput();
          this.ui.appendSystemMessage('✓ verified — start chatting');
        },
        'error-callback': () => {
          this.ui.appendSystemMessage('verification failed — refresh to try again');
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
          this.ui.unlockInput();
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
    setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        el.textContent = CONFIG.subtitleText.slice(0, ++i);
        if (i >= CONFIG.subtitleText.length) clearInterval(interval);
      }, CONFIG.typingSpeedMs);
    }, CONFIG.typingDelayMs);
  }

  async handleAIQuery(query) {
    if (!query || this.chatClient.isLoading) return;

    this.ui.lockInput();
    this.chatClient.pushUserMessage(query);
    this.ui.appendUserMessage(query);

    const spinner = this.ui.showTypingIndicator();

    try {
      const response = await this.chatClient.ask();
      spinner.remove();
      this.ui.appendAIMessage(response);
      this.chatClient.pushAssistantMessage(response);
    } catch (err) {
      spinner.remove();
      this.chatClient.popLastMessage();
      this.ui.appendSystemMessage(`error: ${err.message}`);
    } finally {
      this.ui.unlockInput();
      this.ui.scrollDown();
    }
  }
}

new TerminalApp();
