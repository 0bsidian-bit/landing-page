# 0bsidian AI

Personal website and productivity dashboard for [Dr. Lokesh Tewari](https://lokeshtewari.uk).

Built entirely on Cloudflare — no frameworks, no build step, just clean code.

---

## What It Does

### AI Chat Terminal
A fully interactive AI assistant powered by Cloudflare Workers AI (`gpt-oss-120b`, llama-3.3-70b fallback). Type naturally in the terminal — supports conversational history, `/model`, `/privacy`, and other commands.

### Pomodoro Timer
Circular timer with work and break modes, cycle tracking, rename-able timers, and hover-reveal cycle names. Persists state across page refresh via wall-clock. Auto-advances to the next cycle on completion. Single fullscreen focus-mode toggle expands the entire dashboard.

### Task Manager
Organize work by subject with colour coding. Tasks auto-save to localStorage. Integrates with the Study Buddy to surface pending tasks.

### Study Buddy
A desktop companion that pins to the left or right edge of the screen. Teleports with per-buddy CSS effects (flash, blur-dash, fade, shimmer, pixelate, confetti-poof, ember, glitch, ripple, lightning). Personality archetypes drive behaviour — clingy buddies track your cursor, shy ones flee, chaotic ones jump randomly, stoic ones barely move. Thoughts are personalised using your current task list and pomodoro stats. Silent during breaks.

### People Studying Now
Live counter showing how many people are currently active on the site. Updates every 30 s via heartbeat (90 s TTL in KV).

### Turnstile Protection
Cloudflare Turnstile verifies the first chat request per IP — no CAPTCHA UX, just a seamless background check.

### Privacy First
No analytics, no trackers, no cookies beyond Turnstile. Tasks, timers, chat history, and buddy choice live only in `localStorage`. KV entries (rate-limit buckets, study heartbeat, Turnstile flag) expire automatically. No PII stored.

### PWA / Installable
Ships a `manifest.webmanifest` and service worker for offline shell support. Installs as a standalone app on iOS and Android.

---

## Features at a Glance

| Feature | Details |
|---|---|
| AI Model | `@cf/openai/gpt-oss-120b` (llama-3.3-70b fallback) |
| Timer Modes | Pomodoro (25 m), Short Break (5 m), Long Break (15 m) |
| Timer Persistence | Survives page refresh; auto-advances cycles |
| Security | Turnstile verification, rate limiting (10 req/min) |
| Study Buddy | 10 characters, unique teleport effects, personality archetypes |
| Contact | mailto: form (MX records untouched) |
| Storage | All data in localStorage — nothing on our servers |

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
