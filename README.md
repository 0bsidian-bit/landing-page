# 0bsidian AI

Personal website and productivity dashboard for [Dr. Lokesh Tewari](https://lokeshtewari.uk).

Built entirely on Cloudflare — no frameworks, no build step, just clean code.

---

## What It Does

### 🤖 AI Chat Terminal
A fully interactive AI assistant powered by Cloudflare Workers AI. Just type naturally — no commands needed. Supports multiple models including Llama 3.3 70B and Mistral 7B. Has conversational memory that persists across sessions.

### ⏱ Pomodoro Timer
A beautiful circular timer with work and break modes. Features a glowing star SVG that tracks progress, mode-specific colors (purple for study, teal for breaks), and cycle tracking. Scales up in fullscreen for distraction-free deep work.

### ✅ Task Manager
Organize your work by subjects. Create a subject first, then add tasks within it. Each subject gets its own color. Tasks can be checked off and deleted. Everything saves to your browser automatically.

### 🐾 Study Buddy
A roaming ASCII companion that gently wanders the page while you work. It's aware of your study stats and offers encouraging words powered by AI. Click it to hear its last thought again.

### 👥 Live Counter
See how many people are studying on the site right now. Updates every 30 seconds via heartbeat.

### 🔒 Turnstile Protection
Cloudflare Turnstile verification protects the AI chat from bot abuse — no CAPTCHAs, just a seamless check.

### 🌙 Dark & Light Mode
Two carefully crafted themes. Cards look identical in both modes — only the page background shifts. Toggle with the moon/sun icon.

### 📱 Mobile Friendly
Fully responsive from desktop to phone. Cards stack vertically, typography scales, and unnecessary controls hide on small screens.

---

## Features at a Glance

| Feature | Details |
|---|---|
| AI Models | Llama 3.3 70B, Llama 3.1 8B, Mistral 7B, Gemma 2 9B |
| Timer Modes | Pomodoro (25m), Short Break (5m), Long Break (15m) |
| Themes | Dark mode, Light mode, seamless switching |
| Security | Turnstile verification, rate limiting, strict CSP |
| AI Companion | 10 characters with unique personalities |
| Storage | All data persists in localStorage |

---

## Running Locally

```bash
git clone https://github.com/0bsidian-bit/landing-page.git
cd landing-page
npm install
npx wrangler pages dev .
```

## Deploying

Push to `main` — Cloudflare Pages deploys automatically.

### First-time Setup

1. Create a [Turnstile widget](https://dash.cloudflare.com/turnstile) and note the site key and secret key
2. Update the site key in `app.js` (`setupTurnstile` method)
3. Set the secret key:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```
4. Push to `main`

---

## Credits

Design and development by [Lokesh Tewari](https://lokeshtewari.uk).

## License

MIT
