const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const STORAGE_KEY = 'lt-theme';
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    // no-op
  }
  return colorSchemeQuery.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

applyTheme(getInitialTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // no-op
    }
  });
}

function handleSystemThemeChange(e) {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch (err) {
    // no-op
  }
  applyTheme(e.matches ? 'dark' : 'light');
}

if (typeof colorSchemeQuery.addEventListener === 'function') {
  colorSchemeQuery.addEventListener('change', handleSystemThemeChange);
} else if (typeof colorSchemeQuery.addListener === 'function') {
  colorSchemeQuery.addListener(handleSystemThemeChange);
}

const output = document.getElementById('output');
const input = document.getElementById('cmd-input');
const body = document.getElementById('body');
const terminal = document.getElementById('terminal');
const caret = document.getElementById('caret');

const history = [];
let historyIndex = -1;

const commands = {
  help: `available commands

/about       who this is
/now         current focus
/stack       the homelab
/contact     how to reach me
/version     build info
/clear       clear the screen

type any command and press enter`,

  about: `lokesh tewari. mbbs, junior resident.
rotating through medicine —
learning how the body fails, and how to catch it.

off-hours: a proxmox homelab,
and an ongoing interest in where medicine, ai,
and security quietly overlap.

based in india.`,

  now: `· hardening a homelab, one service at a time
· reading: the emperor of all maladies`,

  stack: `proxmox ve on a single node. lxc for everything.
caddy out front, tailscale for the back door,
pocket id + tinyauth handling sso.

media: jellyfin, immich, the usual *arr suspects.
files: wd mycloud nas, smb-mounted into lxcs.

domain: lokeshtewari.uk, via cloudflare.`,

  contact: `email     tarball.lipid_7i@icloud.com
github    github.com/0bsidian-bit

for clinical or teaching inquiries,
prefix the subject with [clinical].`,

  version: () => {
    const now = new Date();
    const month = now.toLocaleString('en-us', { month: 'long' }).toLowerCase();
    const year = now.getFullYear();
    return `lokeshtewari.uk  v1.0.0
built      ${month} ${year}
runtime    proxmox lxc, caddy, static
uptime     since the last kernel panic`;
  },

  whoami: '0bsidian-bit. a working physician. and you?',
  sudo: 'permission denied. nice try.',
  theme: () => {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // no-op
    }
    return `theme → ${next}`;
  },
  exit: {
    text: 'there is no exit. only the next patient.',
    effect: 'pause-caret'
  }
};

const commandList = Object.keys(commands).map((c) => '/' + c);

function printLine(text, className = '') {
  const lines = text.split('\n');
  lines.forEach((line) => {
    const div = document.createElement('div');
    div.className = 'line' + (className ? ' ' + className : '');
    div.textContent = line || '\u00A0';
    output.appendChild(div);
  });
}

function printUserInput(cmd) {
  const div = document.createElement('div');
  div.className = 'line';

  const prompt = document.createElement('span');
  prompt.className = 'prompt';
  prompt.textContent = '>';

  div.appendChild(prompt);
  div.appendChild(document.createTextNode(cmd));
  output.appendChild(div);
}

function printBlank() {
  const div = document.createElement('div');
  div.className = 'line';
  div.textContent = '\u00A0';
  output.appendChild(div);
}

function scrollDown() {
  body.scrollTop = body.scrollHeight;
}

function clearTerminal() {
  if (typeof output.replaceChildren === 'function') {
    output.replaceChildren();
  } else {
    output.textContent = '';
  }
}

function pauseCaret() {
  caret.classList.add('paused');
  setTimeout(() => caret.classList.remove('paused'), 2000);
}

function handleCommand(raw) {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;

  printUserInput(raw);

  if (cmd === '/clear' || cmd === 'clear') {
    clearTerminal();
    return;
  }

  const key = cmd.startsWith('/') ? cmd.slice(1) : cmd;
  const entry = commands[key];

  if (entry === undefined) {
    printLine(`command not found: ${cmd}`, 'dim');
    printLine('type /help for the list', 'dim');
    printBlank();
    return;
  }

  if (typeof entry === 'string') {
    printLine(entry);
  } else if (typeof entry === 'function') {
    printLine(entry());
  } else if (typeof entry === 'object') {
    printLine(entry.text, 'accent');
    if (entry.effect === 'pause-caret') pauseCaret();
  }

  printBlank();
}

function autocomplete(partial) {
  if (!partial.startsWith('/')) return null;
  const matches = commandList.filter((c) => c.startsWith(partial));
  if (matches.length === 1) return matches[0];
  return null;
}

function bootSequence() {
  const bootText = '> welcome. type /help to begin';
  const div = document.createElement('div');
  div.className = 'line';
  output.appendChild(div);

  let i = 0;
  const typeInterval = setInterval(() => {
    if (i >= bootText.length) {
      clearInterval(typeInterval);
      div.textContent = bootText;
      printBlank();
      input.focus();
      return;
    }
    div.textContent = bootText.slice(0, i + 1);
    i += 1;
  }, 48);
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = input.value;
    if (val.trim()) {
      history.unshift(val);
      historyIndex = -1;
    }
    handleCommand(val);
    input.value = '';
    scrollDown();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (history.length && historyIndex < history.length - 1) {
      historyIndex += 1;
      input.value = history[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex -= 1;
      input.value = history[historyIndex];
    } else {
      historyIndex = -1;
      input.value = '';
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const completed = autocomplete(input.value.trim());
    if (completed) input.value = completed;
  } else if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    clearTerminal();
  }
});

terminal.addEventListener('click', (e) => {
  if (e.target.tagName !== 'BUTTON') input.focus();
});

window.addEventListener('load', () => {
  setTimeout(bootSequence, 1100);
});
