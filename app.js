/**
 * 0bsidian Terminal Application
 * Clean, Object-Oriented Frontend Architecture
 */

const CONFIG = {
  themeKey: 'lt-theme',
  aiHistoryKey: 'lt-ai-history',
  subtitleText: 'notes from a working physician',
  typingSpeedMs: 55,
  botName: '0bsidian',
  botModel: 'Llama 3.3 70B fp8'
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

class ThemeManager {
  constructor() {
    document.documentElement.setAttribute('data-theme', 'dark');
    this.currentTheme = 'dark';
  }
  toggleTheme() { return 'dark'; }
}

class DOMUtils {
  static parseMarkdown(text) {
    const frag = document.createDocumentFragment();
    const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0, m;
    
    while ((m = re.exec(text)) !== null) {
      // Append text before match
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      // Handling bold / italic
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
    
    // Append remaining text
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.conversation = parsed;
        }
      }
    } catch { /* no-op */ }
  }

  saveHistory() {
    try {
      localStorage.setItem(CONFIG.aiHistoryKey, JSON.stringify(this.conversation));
    } catch { /* no-op */ }
  }

  clearMemory() {
    this.conversation = [];
    try {
      localStorage.removeItem(CONFIG.aiHistoryKey);
    } catch { /* no-op */ }
  }

  pushUserMessage(content) {
    this.conversation.push({ role: 'user', content });
  }

  pushAssistantMessage(content) {
    this.conversation.push({ role: 'assistant', content });
    this.saveHistory();
  }

  popLastMessage() {
    this.conversation.pop();
  }
  
  getTurns() {
    return Math.floor(this.conversation.length / 2);
  }

  async ask() {
    this.isLoading = true;
    const modelPicker = document.getElementById('modelPicker');
    const model = modelPicker ? modelPicker.value : null;

    try {
      const token = window.appInstance?.turnstileToken;
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.conversation, model, turnstileToken: token })
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
            `/version     build info\n` +
            `/forget      clear ai memory\n` +
            `/clear       clear the screen\n\n` +
            `type any command and press enter.\nanything not starting with '/' is sent to 0bsidian AI.`,
      about: `lokesh tewari. mbbs.\ni diagnose, present, and occasionally get it right on the first try.\n\noff-hours: a proxmox homelab.\nmedicine and metasploit, in no particular order.\n\nbased in india.`,
      now: `· eating, sleeping, procrastinating.\n· currently: the emperor of all maladies.`,
      github: `github.com/0bsidian-bit\n\nprojects, dotfiles, and occasional proofs of concept.\nopen to collaboration — send a message first.`,
      whoami: '0bsidian-bit. a working physician. and you?',
      sudo: 'permission denied. nice try.',
      version: () => {
        const now = new Date();
        const month = now.toLocaleString('en-us', { month: 'long' }).toLowerCase();
        return `lokeshtewari.uk  v1.0.0\nbuilt      ${month} ${now.getFullYear()}\nruntime    cloudflare pages + workers\nmodel      llama 3.3 70b fp8`;
      }
    };
  }

  initEvents() {
    if (!this.elements.input) return;

    // Prevent rich text pasting
    this.elements.input.addEventListener('paste', e => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    this.elements.input.addEventListener('keydown', e => this.handleKeydown(e));

    // Focus input when clicking anywhere in terminal
    this.elements.terminal?.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') {
        const sel = window.getSelection();
        if (!sel.toString()) this.elements.input.focus();
      }
    });
  }

  setAppInstance(app) {
    this.app = app;
  }

  handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = this.getInputValue().trim();
      if (val) {
        this.history.unshift(val);
        this.historyIndex = -1;
      }
      this.app.routeInput(val);
      this.clearInput();
      this.scrollDown();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.setInputValue(this.history[++this.historyIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex > 0) {
        this.setInputValue(this.history[--this.historyIndex]);
      } else {
        this.historyIndex = -1;
        this.clearInput();
      }
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
    if (matches.length > 1) {
      this.printLine(matches.join('   '), 'dim');
      this.scrollDown();
    }
    return null;
  }

  getInputValue() {
    return this.elements.input.textContent || '';
  }

  setInputValue(text) {
    this.elements.input.textContent = text;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(this.elements.input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  clearInput() {
    this.elements.input.textContent = '';
  }

  clearTerminal() {
    if (this.elements.output.replaceChildren) {
      this.elements.output.replaceChildren();
    } else {
      this.elements.output.textContent = '';
    }
  }

  scrollDown() {
    this.elements.body.scrollTop = this.elements.body.scrollHeight;
  }

  printLine(text, cls = '', markdown = false) {
    text.split('\n').forEach(line => {
      const div = document.createElement('div');
      div.className = 'line' + (cls ? ' ' + cls : '');
      if (markdown && line) {
        div.appendChild(DOMUtils.parseMarkdown(line));
      } else {
        div.textContent = line || '\u00A0';
      }
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

  lockInput() {
    this.elements.input.contentEditable = 'false';
  }

  unlockInput() {
    this.elements.input.contentEditable = 'true';
    this.elements.input.focus();
  }

  createSpinner() {
    const thinkDiv = document.createElement('div');
    thinkDiv.className = 'line ai-thinking';
    this.elements.output.appendChild(thinkDiv);
    this.scrollDown();

    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let fi = 0;
    const interval = setInterval(() => {
      thinkDiv.textContent = frames[fi++ % frames.length] + ' thinking';
    }, 80);

    return {
      remove: () => {
        clearInterval(interval);
        thinkDiv.remove();
      }
    };
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
  constructor() {
    this.ctx = null;
  }
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

class PomodoroTimer {
  constructor() {
    this.modes = {
      pomodoro: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    this.currentMode = 'pomodoro';
    this.timeLeft = this.modes.pomodoro;
    this.isRunning = false;
    this.timerId = null;
    
    // Load stats
    let stats = { cycles: 0 };
    try { stats = JSON.parse(localStorage.getItem('0bsidian_pomo_stats')) || stats; } catch {}
    this.cycle = stats.cycles + 1;
    this.baseTitle = document.title;
    
    this.audio = new PomoAudio();
    
    this.elements = {
      tabs: document.querySelectorAll('.pomo-tab'),
      time: document.getElementById('pomoTime'),
      progress: document.getElementById('pomoProgress'),
      tip: document.getElementById('pomoTip'),
      toggleBtn: document.getElementById('pomoToggle'),
      resetBtn: document.getElementById('pomoReset'),
      cycleInfo: document.getElementById('pomoCycle'),
      tomatoes: document.querySelectorAll('.pomo-tomato'),
      settingsBtn: document.getElementById('pomoSettingsBtn'),
      settingsMenu: document.getElementById('pomoSettingsMenu'),
      settingTick: document.getElementById('settingTick'),
      settingBell: document.getElementById('settingBell'),
      fullscreenBtn: document.getElementById('hubFullscreenBtn'),
      hub: document.getElementById('prodHub')
    };

    if (this.elements.cycleInfo) {
      this.elements.cycleInfo.textContent = this.cycle;
    }
    this.updateCycleDots();

    this.initEvents();
    this.updateDisplay();
  }

  updateCycleDots() {
    this.elements.tomatoes.forEach((t, i) => {
      const activeIdx = (this.cycle - 1) % 4;
      if (i <= activeIdx) t.classList.add('active');
      else t.classList.remove('active');
    });
  }

  initEvents() {
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        if (this.isRunning) {
          if (!(await siteConfirm('Switch mode? This will reset your current timer.'))) return;
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
    this.elements.settingsBtn?.addEventListener('click', () => {
      this.elements.settingsMenu?.classList.toggle('open');
    });
    this.elements.fullscreenBtn?.addEventListener('click', () => {
      const hub = this.elements.hub;
      if (!hub) return;
      
      if (!document.fullscreenElement) {
        hub.requestFullscreen().then(() => {
          hub.classList.add('fullscreen');
          this.elements.fullscreenBtn.textContent = "[✕] exit full";
        }).catch(() => {
          // Fallback to CSS-only if API is blocked
          hub.classList.add('fullscreen');
          this.elements.fullscreenBtn.textContent = "[✕] exit full";
        });
      } else {
        document.exitFullscreen().then(() => {
          hub.classList.remove('fullscreen');
          this.elements.fullscreenBtn.textContent = "[⛶] fullscreen";
        }).catch(() => {
          hub.classList.remove('fullscreen');
          this.elements.fullscreenBtn.textContent = "[⛶] fullscreen";
        });
      }
    });
    
    // Handle exiting fullscreen via Escape key
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.elements.hub?.classList.contains('fullscreen')) {
        this.elements.hub.classList.remove('fullscreen');
        this.elements.fullscreenBtn.textContent = "[⛶] fullscreen";
      }
    });
  }

  setMode(mode) {
    if (!this.modes[mode]) return;
    this.currentMode = mode;
    this.timeLeft = this.modes[mode];
    this.pause();
    
    this.elements.tabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`.pomo-tab[data-mode="${mode}"]`)?.classList.add('active');
    
    // Visual mode: breaks get a warm teal ring + matching tip
    if (this.elements.progress) {
      if (mode === 'pomodoro') {
        this.elements.progress.style.stroke = '';
        // Reset tip to default (dark fill + purple stroke)
        const tipPath = this.elements.tip?.querySelector('path');
        if (tipPath) { tipPath.setAttribute('stroke', 'var(--accent)'); tipPath.setAttribute('fill', '#262630'); }
      } else {
        this.elements.progress.style.stroke = '#5eead4';
        // Tip: dark fill + teal stroke for contrast against teal ring
        const tipPath = this.elements.tip?.querySelector('path');
        if (tipPath) { tipPath.setAttribute('stroke', '#5eead4'); tipPath.setAttribute('fill', '#262630'); }
      }
    }
    
    this.updateDisplay();
  }

  async toggle() {
    this.audio.init(); // enable audio context on user gesture
    if (this.isRunning) {
      if (!(await siteConfirm('Pause the timer?'))) return;
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning || this.timeLeft <= 0) return;
    this.isRunning = true;
    this.elements.toggleBtn.textContent = '⏸';
    this.timerId = setInterval(() => this.tick(), 1000);
    if (window.appInstance && window.appInstance.companion) window.appInstance.companion.setWorkingState(true);
  }

  pause() {
    this.isRunning = false;
    this.elements.toggleBtn.textContent = '▶';
    clearInterval(this.timerId);
    document.title = this.baseTitle;
    if (window.appInstance && window.appInstance.companion) window.appInstance.companion.setWorkingState(false);
  }

  reset() {
    this.pause();
    this.timeLeft = this.modes[this.currentMode];
    this.updateDisplay();
  }

  tick() {
    this.timeLeft--;
    this.updateDisplay();
    
    if (this.elements.settingTick?.checked) {
      this.audio.playTick();
    }
    
    if (this.timeLeft <= 0) {
      this.pause();
      if (this.elements.settingBell?.checked) {
        this.audio.playBell();
      }
      if (this.currentMode === 'pomodoro') {
        let stats = { cycles: 0 };
        try { stats = JSON.parse(localStorage.getItem('0bsidian_pomo_stats')) || stats; } catch {}
        stats.cycles++;
        localStorage.setItem('0bsidian_pomo_stats', JSON.stringify(stats));
        
        this.cycle = stats.cycles + 1;
        if (this.elements.cycleInfo) this.elements.cycleInfo.textContent = this.cycle;
        this.updateCycleDots();
        
        this.setMode(this.cycle % 4 === 0 ? 'longBreak' : 'shortBreak');
      } else {
        this.setMode('pomodoro');
      }
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (this.elements.time) this.elements.time.textContent = formatted;
    
    if (this.isRunning) {
      document.title = `(${formatted}) ${this.baseTitle}`;
    }

    if (this.elements.progress) {
      const total = this.modes[this.currentMode];
      const percent = this.timeLeft / total; // 1.0 → 0.0
      
      // Negative dashoffset = gap grows in the draw direction (clockwise after CSS -90deg rotation)
      // This makes the ring drain CLOCKWISE from 12 o'clock
      this.elements.progress.style.strokeDashoffset = -339.292 * (1 - percent);
      
      if (this.elements.tip) {
        // The tip follows the leading edge of the draining ring.
        // With negative dashoffset, the gap grows clockwise from 12 o'clock.
        // In the rotated SVG (-90deg), angle=0 is at 12 o'clock visually.
        // As time drains, the tip needs to move clockwise = negative angle direction.
        const consumed = (1 - percent) * 2 * Math.PI;
        const cx = 60, cy = 60, r = 54;
        // Negative angle for clockwise movement in the CSS-rotated frame
        const tx = cx + r * Math.cos(-consumed);
        const ty = cy + r * Math.sin(-consumed);
        const rotDeg = (1 - percent) * 720;
        this.elements.tip.setAttribute('transform', `translate(${tx}, ${ty}) rotate(${rotDeg})`);
      }
    }
  }
}

class TodoManager {
  constructor() {
    this.list = document.getElementById('todoList');
    this.input = document.getElementById('todoInput');
    this.color = document.getElementById('todoColor');
    this.addBtn = document.getElementById('todoAdd');
    
    // Data: [{ id, subject, color, tasks: [{id, text, done}] }]
    this.subjects = [];
    try { this.subjects = JSON.parse(localStorage.getItem('0bsidian_todos_v2')) || []; } catch {}
    
    // Migrate old format if needed
    let oldTodos = null;
    try { oldTodos = JSON.parse(localStorage.getItem('0bsidian_todos')); } catch {}
    if (oldTodos && oldTodos.length && !this.subjects.length) {
      const grouped = {};
      oldTodos.forEach(t => {
        if (!grouped[t.subject]) grouped[t.subject] = { color: t.color, tasks: [] };
        grouped[t.subject].tasks.push({ id: t.id, text: t.text, done: t.done });
      });
      for (const [subj, data] of Object.entries(grouped)) {
        this.subjects.push({ id: Date.now() + Math.random(), subject: subj, color: data.color, tasks: data.tasks });
      }
      this.save();
    }
    
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
    let val = this.input.value.trim();
    if (!val) return;
    
    this.subjects.push({
      id: Date.now(),
      subject: val,
      color: this.color.value,
      tasks: []
    });
    
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

  save() {
    localStorage.setItem('0bsidian_todos_v2', JSON.stringify(this.subjects));
  }

  render() {
    if (!this.list) return;
    this.list.replaceChildren();
    
    this.subjects.forEach(subj => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'todo-subject-group';
      
      // Subject header row
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
        // Toggle inline input
        const existing = groupDiv.querySelector('.todo-task-input-row');
        if (existing) { existing.remove(); return; }
        
        const row = document.createElement('div');
        row.className = 'todo-task-input-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'add task...';
        inp.className = 'todo-task-inline-input';
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' && inp.value.trim()) {
            this.addTask(subj.id, inp.value);
          }
          if (ev.key === 'Escape') row.remove();
        });
        row.appendChild(inp);
        
        // Insert after header
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
      
      // Tasks
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

class StudyCompanion {
  constructor() {
    this.container = document.querySelector('.study-companion');
    this.artEl = document.getElementById('companionArt');
    this.speechEl = document.getElementById('companionSpeech');
    if (!this.artEl || !this.container) return;
    
    this.buddies = [
      { id: 1, name: 'Apollo', art: "  __\n<(o )___\n ( ._> /\n  `---'", trait: 'snark' },
      { id: 2, name: 'Hermes', art: " .-. \n(o o)\n| O \\\n \\   \\\n  `~~~'", trait: 'chaos' },
      { id: 3, name: 'Athena', art: " ,___,\n [O.o]\n /)__)\n  \" \"", trait: 'wisdom' },
      { id: 4, name: 'Artemis', art: " /\\_/\\\n( o.o )\n > ^ <", trait: 'patience' },
      { id: 5, name: 'Hephaestus', art: " [0_0]\n /| |\\\n  |_|", trait: 'debugging' },
      { id: 6, name: 'Dionysus', art: "  ___\n (o o)\n(  _  )", trait: 'patience' },
      { id: 7, name: 'Hestia', art: "  .----.\n /      \\\n(   @  @ )\n \\  --  /\n  `----'", trait: 'wisdom' },
      { id: 8, name: 'Ares', art: "  /\\\n (  )\n  \\/", trait: 'chaos' },
      { id: 9, name: 'Poseidon', art: "  ,-.\n (o o)\n /| |\\", trait: 'snark' },
      { id: 10, name: 'Zeus', art: " ^...^\n<_* *_>\n  \\_/", trait: 'debugging'}
    ];

    let saved = localStorage.getItem('0bsidian_pet_id');
    if (!saved) {
      saved = this.buddies[Math.floor(Math.random() * this.buddies.length)].id;
      localStorage.setItem('0bsidian_pet_id', saved);
    }
    this.buddy = this.buddies.find(b => b.id == saved) || this.buddies[0];
    
    this.artEl.textContent = this.buddy.art;
    this.isWorking = false;
    this.thoughtTimer = null;
    this.lastMessage = `Hi, I am ${this.buddy.name}.`;
    
    // Roaming state
    this.roamTimer = null;
    this.targetX = null;
    this.targetY = null;

    this.artEl.addEventListener('click', () => {
      this.say(this.lastMessage);
    });
    
    setTimeout(() => this.say(this.lastMessage), 1000);
    
    // Start gentle roaming — moves every 15-30 seconds
    this.startRoaming();
  }

  startRoaming() {
    const roam = () => {
      this.moveToSafePosition();
      // Random interval between 15-30 seconds
      const next = 15000 + Math.random() * 15000;
      this.roamTimer = setTimeout(roam, next);
    };
    this.roamTimer = setTimeout(roam, 10000); // First move after 10s
  }

  moveToSafePosition() {
    if (!this.container) return;
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = this.container.offsetWidth || 80;
    const ch = this.container.offsetHeight || 100;
    
    // Define forbidden zones (the 3 app cards)
    const forbidden = [];
    const hub = document.getElementById('prodHub');
    const terminal = document.querySelector('.terminal');
    if (hub) forbidden.push(hub.getBoundingClientRect());
    if (terminal) forbidden.push(terminal.getBoundingClientRect());

    // Try random positions until we find one not overlapping any app
    let attempts = 0;
    let x, y;
    do {
      // Bias toward edges — the buddy prefers margins
      const edge = Math.random();
      if (edge < 0.3) {
        // Bottom area
        x = 40 + Math.random() * (vw - cw - 80);
        y = vh - ch - 20 - Math.random() * 100;
      } else if (edge < 0.6) {
        // Right side
        x = vw - cw - 20 - Math.random() * 100;
        y = 80 + Math.random() * (vh - ch - 160);
      } else {
        // Left side
        x = 20 + Math.random() * 100;
        y = 80 + Math.random() * (vh - ch - 160);
      }
      attempts++;
    } while (attempts < 20 && this.overlapsAny(x, y, cw, ch, forbidden));

    // Smooth transition
    this.container.style.transition = 'left 2s ease-in-out, top 2s ease-in-out, bottom 2s ease-in-out, right 2s ease-in-out';
    this.container.style.position = 'fixed';
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.bottom = 'auto';
    this.container.style.right = 'auto';
  }

  overlapsAny(x, y, w, h, rects) {
    const buddy = { left: x, top: y, right: x + w, bottom: y + h };
    for (const r of rects) {
      if (buddy.left < r.right + 20 && buddy.right > r.left - 20 &&
          buddy.top < r.bottom + 20 && buddy.bottom > r.top - 20) {
        return true;
      }
    }
    return false;
  }

  setWorkingState(working) {
    if (this.isWorking === working || !this.artEl) return;
    this.isWorking = working;
    
    if (working) {
      this.artEl.classList.add('working');
      this.fetchThought();
      this.thoughtTimer = setInterval(() => this.fetchThought(), 2 * 60 * 1000);
    } else {
      this.artEl.classList.remove('working');
      clearInterval(this.thoughtTimer);
      this.say(`Rest well.`);
    }
  }

  async fetchThought() {
    let pomoStats = 0, subjects = [];
    try { pomoStats = (JSON.parse(localStorage.getItem('0bsidian_pomo_stats')) || {}).cycles || 0; } catch {}
    try { subjects = JSON.parse(localStorage.getItem('0bsidian_todos_v2')) || []; } catch {}
    let tasksDone = 0, totalTasks = 0;
    subjects.forEach(s => {
      totalTasks += s.tasks.length;
      tasksDone += s.tasks.filter(t => t.done).length;
    });

    try {
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.buddy.name,
          trait: this.buddy.trait,
          stats: `${pomoStats} pomodoros, ${tasksDone}/${totalTasks} tasks complete`
        })
      });
      if (res.ok) {
        const data = await res.json();
        this.say(data.response);
      }
    } catch { /* noop */ }
  }

  say(text) {
    if (!this.speechEl) return;
    this.lastMessage = text;
    this.speechEl.textContent = text;
    this.speechEl.classList.add('show');
    
    if(this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.speechEl.classList.remove('show'), 20000);
  }
}

class TailscaleOverlay {
  constructor() {
    this.overlay = document.getElementById('tailscaleOverlay');
    this.initEvents();
  }

  initEvents() {
    document.getElementById('monogramName')?.addEventListener('click', () => this.open());
    document.getElementById('tsCancel')?.addEventListener('click', () => this.close());
    document.getElementById('tsConfirm')?.addEventListener('click', () => {
      window.location.href = "https://start.lokeshtewari.uk";
    });
    
    this.overlay?.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this.close();
    });
  }

  open() {
    this.overlay?.classList.add('open');
    this.overlay?.setAttribute('aria-hidden', 'false');
  }

  close() {
    this.overlay?.classList.remove('open');
    this.overlay?.setAttribute('aria-hidden', 'true');
  }
}

class TerminalApp {
  constructor() {
    this.themeManager = new ThemeManager();
    this.chatClient = new ChatClient();
    this.ui = new TerminalUI();
    this.pomodoro = new PomodoroTimer();
    this.tailscale = new TailscaleOverlay();
    this.todo = new TodoManager();
    this.companion = new StudyCompanion();
    
    this.ui.setAppInstance(this);
    
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => this.boot());
    } else {
      this.boot();
    }
  }

  boot() {
    window.appInstance = this;
    window.scrollTo(0, 0);
    
    this.turnstileToken = null;
    this.turnstileWidgetId = null;
    
    this.animateHeroSubtitle();
    setTimeout(() => this.bootTerminalEnvironment(), 450);
    this.setupTerminalFullscreen();
    this.startHeartbeat();
    this.startStudyingCounter();
    this.setupChatScroll();
    this.setupTurnstile();
    
    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
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
    
    // Lock input until verified
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

    // Wait for Turnstile script to load (async defer)
    if (typeof turnstile !== 'undefined') {
      renderWidget();
    } else {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (typeof turnstile !== 'undefined') {
          clearInterval(poll);
          renderWidget();
        } else if (attempts >= 20) {
          clearInterval(poll);
          // Script never loaded — allow chat without verification (dev/localhost)
          wrap.classList.add('verified');
          if (this.ui.elements.input) {
            this.ui.elements.input.setAttribute('contenteditable', 'true');
          }
        }
      }, 500);
    }
  }

  setupTerminalFullscreen() {
    const btn = document.getElementById('termFullscreenBtn');
    const terminal = document.querySelector('.terminal');
    if (!btn || !terminal) return;

    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        terminal.requestFullscreen().then(() => {
          terminal.classList.add('fullscreen');
          btn.textContent = '✕';
        }).catch(() => {
          terminal.classList.add('fullscreen');
          btn.textContent = '✕';
        });
      } else {
        document.exitFullscreen().then(() => {
          terminal.classList.remove('fullscreen');
          btn.textContent = '⛶';
        }).catch(() => {
          terminal.classList.remove('fullscreen');
          btn.textContent = '⛶';
        });
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && terminal.classList.contains('fullscreen')) {
        terminal.classList.remove('fullscreen');
        btn.textContent = '⛶';
      }
    });
  }

  startHeartbeat() {
    const beat = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    beat();
    setInterval(beat, 60000); // Every 60 seconds
  }

  startStudyingCounter() {
    const el = document.getElementById('studyingCount');
    if (!el) return;
    
    const poll = async () => {
      try {
        const res = await fetch('/api/studying');
        if (res.ok) {
          const data = await res.json();
          el.textContent = data.count || 1;
        }
      } catch {
        el.textContent = '1';
      }
    };
    poll();
    setInterval(poll, 30000); // Every 30 seconds
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
    if (this.ui.elements.badge) this.ui.elements.badge.textContent = CONFIG.botModel;
    if (this.ui.elements.prompt) this.ui.elements.prompt.textContent = '>';
    
    this.ui.clearTerminal();

    const turns = this.chatClient.getTurns();
    if (turns > 0) {
      this.ui.printLine(`${turns} exchange${turns !== 1 ? 's' : ''} in memory  ·  /forget to clear`, 'ai-system');
    } else {
      this.ui.printLine('type naturally to chat with AI', 'ai-system');
    }
    
    this.ui.printBlank();
  }

  routeInput(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    if (!cmd.startsWith('/')) {
      this.handleAIQuery(raw.trim());
      return;
    }

    this.handleLocalCommand(cmd);
  }

  handleLocalCommand(cmd) {
    this.ui.printUserInput(cmd);

    if (cmd === '/clear') {
      this.ui.clearTerminal();
      return;
    }

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
    } else if (typeof entry === 'object') {
      if (key === 'theme') {
        const result = this.themeManager.toggleTheme();
        this.ui.printLine(`theme → ${result}`);
      } else {
        this.ui.printLine(entry.text, 'accent');
        if (entry.effect === 'pause-caret') this.ui.pauseCaret();
      }
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
      this.chatClient.popLastMessage(); // Revert user message on error
      this.ui.printLine(`error: ${err.message}`, 'ai-error');
    } finally {
      this.ui.printBlank();
      this.ui.unlockInput();
      this.ui.scrollDown();
    }
  }
}

// Initialize Application
new TerminalApp();
