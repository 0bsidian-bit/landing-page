# 0bsidian AI

Personal website and productivity dashboard for [Dr. Lokesh Tewari](https://lokeshtewari.uk).

Built entirely on Cloudflare — no frameworks, no build step, just clean code.

---

## What It Does

### Two Timer Modes

**Focus Mode (default)** — counts up from zero. Press play to start focusing; press pause to automatically begin a break countdown (also counting up from zero). Press play again to end the break and start a new focus session. Both focus and break durations are logged to the session history.

**Pomodoro Mode** — classic countdown timer with a circular progress ring. Focus and rest periods only (no long break). Timer name is editable by clicking directly on it.

Both modes support inline timer rename, a master sound toggle, and warn before the tab is closed if the timer is running.

### iMessage-Style AI Chat
Conversational AI chat powered by Cloudflare Workers AI (`llama-3.1-8b`). Messages appear as styled bubbles — user on the right, AI on the left. Memory persists across sessions via localStorage. Use the menu to clear memory or clear the chat.

### Study Buddy
A desktop companion that lives in the top-left corner. 10 characters with productivity-archetype personalities (focused, strategic, calm, analytical, etc.). Thoughts are generated from your current task list and pomodoro stats. Appears below the ASCII art so speech is always readable.

### Task Manager
Organise work by subject with colour coding. Auto-saves to localStorage. Surfaces pending tasks to the Study Buddy.

### Session Log
Every completed focus or pomodoro session is logged with name, duration, and timestamp. Inline rename and delete. Up to 100 entries.

### People Studying Now
Live counter showing active sessions on the site. Updates every 30 s via heartbeat (90 s TTL in KV).

### Developer Message
Click **Dr. Lokesh Tewari** in the footer to read a message from the developer. Fetched live from `message.md` in this repo.

### Privacy First
No analytics, no trackers, no cookies beyond Turnstile. Tasks, timers, chat history, and buddy choice live only in `localStorage`. KV entries expire automatically. No PII stored.

### PWA / Installable
Ships a `manifest.webmanifest` and service worker. Installs as a standalone app. The install prompt appears as a small icon in the topbar — only visible on browsers where the PWA is not already installed.

---

## Features at a Glance

| Feature | Details |
|---|---|
| AI Model | `@cf/meta/llama-3.1-8b-instruct` (both chat and companion) |
| Timer Modes | Focus (count-up) · Pomodoro (countdown + ring) |
| Timer Persistence | Survives page refresh via wall-clock |
| Sound | Master toggle in controls column; mechanical tick + bell |
| Study Buddy | 10 characters, unique teleport effects, productivity personalities |
| Security | Turnstile verification, rate limiting (10 req/min) |
| Storage | All data in localStorage — nothing on servers |

---

## Running Locally

```bash
git clone https://github.com/0bsidian-bit/landing-page.git
cd landing-page
npm install
npx wrangler dev
```

Worker runs on `http://localhost:8787`. Static files served from the same origin via Wrangler.

## Deploying

Push to `main` — Cloudflare Workers deploys automatically.

### First-time Setup

1. Create a [Turnstile widget](https://dash.cloudflare.com/turnstile) and note the site key and secret key
2. Update the site key in `app.js` (`setupTurnstile` method)
3. Set the secret key:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```
4. Bind a KV namespace named `RATE_LIMIT_KV` in `wrangler.jsonc`
5. Push to `main`

---

## Credits

Design and development by [Lokesh Tewari](https://lokeshtewari.uk).

## License

MIT
