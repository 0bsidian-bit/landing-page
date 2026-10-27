# 0bsidian

A pomodoro timer set on a new picture every day, at [lokeshtewari.uk](https://lokeshtewari.uk).

The picture is NASA's Astronomy Picture of the Day (or Bing's photo of the day, or a scene painted in the browser). When a focus session starts, the picture goes grey and out of focus, unobserved, and resolves back into colour as the session runs. Finish the session and you see all of it.

Built on Cloudflare Workers. No framework and no build step.

---

## Features

**The timer.** Focus, short break and long break, with a long break after a set number of sessions (4 by default). Skip, reset, optional auto-start for breaks and for the next session, and a daily focus goal. The timer survives a refresh or a closed tab: a session that ran out while the page was closed is logged when you come back.

**The picture of the day.**
- *Space*: NASA's APOD, public-domain images only (anything with a named copyright holder is skipped).
- *Earth*: Bing's photo of the day.
- *Painted*: four built-in canvas scenes. Winden (a foggy forest), Event horizon (a black hole and its accretion disk), Obsidian and Glacier.

The page reads each picture and picks light or dark text and an accent colour to match. "Prefer dark pictures" falls back to the newest dark picture of the past few weeks on a bright day. There's also a dim slider and a switch for the develop effect.

**Tasks.** Add a task with an estimate in pomodoros. The active task shows above the timer, each finished focus session counts towards it, and the sheet estimates when you'll be done, breaks included.

**Today.** Focused time, sessions, day streak, progress to the daily goal, a 24-hour line of the day's sessions and the full history.

**Sounds.** Rain, waves, fan, brown and pink noise, all synthesised in the browser with the Web Audio API. Optionally only while a focus session runs.

**Small things.** Quotes on time and physics (Einstein, Feynman, Heisenberg, Dark). A breathing cue during breaks (4 seconds in, 6 out). The tab's icon turns into a progress ring while a timer runs. Optional system notifications when a timer ends in a background tab. A pop-out mini timer that stays on top (Chromium browsers). Zen mode.

**Keyboard.** `Space` start or pause · `R` reset · `S` skip · `T` tasks · `F` zen mode · `P` pop-out timer

**Privacy.** Tasks, settings and history live only in the browser's `localStorage`. No analytics, ads, cookies or third-party scripts. Pictures are fetched by the worker and passed through, so visitors' browsers never contact NASA or Microsoft.

---

## How it fits together

| File | What it does |
|---|---|
| `index.html` | The page: poster layout, sheets and modals |
| `styles.css` | All styles. Tokens at the top; `data-tone="light"` flips them for bright pictures |
| `boot.js` | Runs before first paint and re-applies the last picture's colours |
| `app.js` | Timer, tasks, history, sounds, scenes, picture of the day |
| `worker.js` | `/api/wallpaper` (recent pictures) and `/api/wallpaper/image` (image proxy), both edge-cached |
| `sw.js` | Caches the app shell and handles notification clicks |

Fonts are self-hosted: Bodoni Moda for the numerals and headings, Schibsted Grotesk for everything else.

## Running locally

```bash
git clone https://github.com/0bsidian-bit/landing-page.git
cd landing-page
npm install
npx wrangler dev
```

The site runs on `http://localhost:8787`.

## Deploying

Push to `main` and Cloudflare deploys it.

Optional settings:

- **NASA API key.** Without one the worker uses NASA's shared `DEMO_KEY`, which is rate-limited. Get a free key at [api.nasa.gov](https://api.nasa.gov) and add it with `npx wrangler secret put NASA_API_KEY`.
- **Bing region.** `BING_MARKET` in `wrangler.jsonc` picks the region for the Earth photo (`en-US`, `en-GB`, `en-IN` and so on).

---

Design and development by [Dr. Lokesh Tewari](https://lokeshtewari.uk) · social@lokeshtewari.uk

MIT licence
