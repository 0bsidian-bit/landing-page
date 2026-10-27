# 0bsidian

A pomodoro timer set on a new picture every day, at [lokeshtewari.uk](https://lokeshtewari.uk).

The picture is NASA's Astronomy Picture of the Day, Bing's photo of the day, or a scene painted in the browser. When a focus session starts, the picture goes grey and out of focus, unobserved, and resolves back into colour as the session runs. Finish the session and you see all of it.

Built on Cloudflare Workers. No framework, no build step, no API keys.

---

## Features

**The timer.** Focus, short break and long break, with a long break after a set number of sessions (4 by default). Skip, reset, optional auto-start for breaks and for the next session, and a daily focus goal. The timer survives a refresh or a closed tab: a session that ran out while the page was closed is logged when you come back.

**The picture of the day.** Three sources, picked in the Picture sheet:

- *Space* (default): NASA's Astronomy Picture of the Day, public-domain images only.
- *Earth*: Bing's photo of the day.
- *Painted*: four built-in canvas scenes. Winden (a foggy forest), Event horizon (a black hole and its accretion disk), Obsidian and Glacier. These are also the fallback when a source can't be reached.

The page reads each picture and picks light or dark text and an accent colour to match. "Prefer dark pictures" (on by default) falls back to the newest dark picture on a bright day. You can also pick any recent picture from the sheet, dim the picture, or turn off the develop effect.

**Tasks.** Add a task with an estimate in pomodoros. The active task shows above the timer, each finished focus session counts towards it, and the sheet estimates when you'll be done, breaks included.

**Today.** Focused time, sessions, day streak, progress to the daily goal, a 24-hour line of the day's sessions and the full history.

**Sounds.** Rain, waves, fan, brown and pink noise, all synthesised in the browser with the Web Audio API. Optionally only while a focus session runs.

**Small things.** Quotes on time and physics (Einstein, Feynman, Heisenberg, Hawking, Curie, Dark). A breathing cue during breaks (4 seconds in, 6 out). The tab's icon turns into a progress ring while a timer runs. Optional system notifications when a timer ends in a background tab. A pop-out mini timer that stays on top (Chromium browsers). Zen mode.

**Keyboard.** `Space` start or pause · `R` reset · `S` skip · `T` tasks · `F` zen mode · `P` pop-out timer

**Privacy.** Tasks, settings and history live only in the browser's `localStorage`. No analytics, ads, cookies or third-party scripts. Pictures are fetched by the worker and passed through, so visitors' browsers never contact NASA or Microsoft.

---

## Where the pictures come from

The worker has two routes, both cached at Cloudflare's edge:

| Route | What it does | Cached |
|---|---|---|
| `GET /api/wallpaper?source=apod\|bing` | Recent pictures with title, caption, credit, link and image URLs | 30 minutes |
| `GET /api/wallpaper/image?…` | Passes one image through from NASA or Bing | 7 days |

**NASA** comes from [`science.nasa.gov/wp-json/wp/v2/apod-basic`](https://science.nasa.gov/wp-json/wp/v2/apod-basic), which replaces the old `api.nasa.gov/planetary/apod` endpoint (archived on 1 December 2026). The worker reads the newest 25 entries and skips videos and anything with a copyright holder, keeping NASA's public-domain images. The image comes from `hdurl`, and the HTML title, explanation and credit are turned into plain text. Only image files on NASA's own hosts (`science.nasa.gov`, `assets.science.nasa.gov`, `apod.nasa.gov`) are passed through.

**Bing** comes from `bing.com/HPImageArchive.aspx` (the last 8 days). Images are requested by their `OHR.` id at a fixed set of sizes: 400×240 for thumbnails, 1920×1080, UHD, and 1080×1920 for phones.

Anything else sent to the image route gets a `400`. The worker only accepts `GET` and `HEAD`.

---

## How it fits together

| File | What it does |
|---|---|
| `index.html` | The page: poster layout, sheets and modals |
| `styles.css` | All styles. Tokens at the top; `data-tone="light"` flips them for bright pictures |
| `boot.js` | Runs before first paint and re-applies the last picture's colours, so nothing flashes |
| `app.js` | Timer, tasks, history, sounds, painted scenes, picture of the day, pop-out timer |
| `worker.js` | The two picture routes above |
| `sw.js` | Caches the app shell for offline use and handles notification clicks |
| `_headers` | Security headers and the Content Security Policy (everything is same-origin) |
| `fonts/` | Bodoni Moda for the numerals and headings, Schibsted Grotesk for everything else |
| `icons/`, `favicon.svg` | The triquetra mark at app-icon sizes |

When you change `styles.css`, `app.js` or `boot.js`, bump its `?v=` number in `index.html` and the matching entry in `sw.js`, and bump `CACHE` in `sw.js`, so returning visitors get the new files.

## Running locally

```bash
git clone https://github.com/0bsidian-bit/landing-page.git
cd landing-page
npm install
npx wrangler dev
```

The site runs on `http://localhost:8787`, with the worker fetching real pictures from NASA and Bing.

## Deploying

Push to `main` and Cloudflare deploys it.

Nothing else is needed: no secrets, no KV namespaces, no AI binding. The only setting is `BING_MARKET` in `wrangler.jsonc`, which picks the region for the Earth photo (`en-US`, `en-GB`, `en-IN` and so on).

---

Design and development by [Dr. Lokesh Tewari](https://lokeshtewari.uk) · social@lokeshtewari.uk

MIT licence
