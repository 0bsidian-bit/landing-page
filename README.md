# 0bsidian

A browser homepage and pomodoro timer set on a new picture every day, at [lokeshtewari.uk](https://lokeshtewari.uk).

The picture is NASA's Astronomy Picture of the Day, Bing's photo of the day, or a scene painted in the browser. The site opens on a search view: a search bar, your shortcuts and the time. The focus view holds the pomodoro timer. When a focus session starts, the picture goes grey and out of focus, unobserved, and resolves back into colour as the session runs. Finish the session and you see all of it.

Built on Cloudflare Workers. No framework, no build step, no API keys.

---

## Features

**Search (the homepage).** A search bar over the picture, with Google, DuckDuckGo, Bing, PubMed, Wikipedia or YouTube. Type an address like `github.com` and it goes straight there. Start typing anywhere on the page and it goes into the search bar, or press `/`. Ctrl or ⌘ + Enter opens the result in a new tab (or turn on "open searches in a new tab" in settings). Up to 12 shortcuts sit under the search bar. The time and date fill the bottom corner, in a 24-hour or 12-hour clock.

**Two views.** `search` and `focus` tabs sit next to the logo. A running timer keeps going on the search view and shows its time on the focus tab. `/#focus` opens straight to the timer, which is handy as a bookmark.

**The timer.** Focus, short break and long break, with a long break after a set number of sessions (4 by default). Skip, reset, optional auto-start for breaks and for the next session, and a daily focus goal. The timer survives a refresh or a closed tab: a session that ran out while the page was closed is logged when you come back.

**The picture of the day.** Three sources, picked in the Picture sheet:

- *Space* (default): NASA's Astronomy Picture of the Day. On video days it shows a still from the video.
- *Earth*: Bing's photo of the day.
- *Painted*: four built-in canvas scenes. Night forest, Event horizon (a black hole and its accretion disk), Obsidian and Glacier.

Today's picture always comes first. If the chosen source doesn't answer, the site uses the other one, then a painted scene, and says so in a short note. The page reads each picture and picks light or dark text and an accent colour to match. Turn on "prefer dark pictures" and a bright day falls back to the newest dark one. You can also pick any recent picture from the sheet, dim it, or turn off the develop effect.

**Tasks.** Add a task with an estimate in pomodoros. The active task shows above the timer, each finished focus session counts towards it, and the sheet estimates when you'll be done, breaks included.

**Today.** Focused time, sessions, day streak, progress to the daily goal, a 24-hour line of the day's sessions and the full history.

**Sounds.** Rain, waves, fan, brown and pink noise, all synthesised in the browser with the Web Audio API. Optionally only while a focus session runs.

**Small things.** Quotes on time and physics (Einstein, Feynman, Heisenberg, Hawking, Curie, Dark). A breathing cue during breaks (4 seconds in, 6 out). The tab's icon turns into a progress ring while a timer runs. Optional system notifications when a timer ends in a background tab. A pop-out mini timer that stays on top (Chromium browsers). Zen mode.

**Keyboard.** `/` search · and in the focus view: `Space` start or pause · `R` reset · `S` skip · `T` tasks · `F` zen mode · `P` pop-out timer

**Privacy.** Tasks, shortcuts, settings and history live only in the browser's `localStorage`. Searches go straight from your browser to the engine you picked. No analytics, ads, cookies or third-party scripts. Pictures are fetched by the worker and passed through, so visitors' browsers never contact NASA or Microsoft.

---

## Where the pictures come from

The worker has two routes, both cached at Cloudflare's edge:

| Route | What it does | Cached |
|---|---|---|
| `GET /api/wallpaper?source=apod\|bing` | Recent pictures with title, caption, credit, link and image URLs | 30 minutes |
| `GET /api/wallpaper/image?…` | Passes one image through from NASA or Bing | 7 days |

**NASA** comes from [`science.nasa.gov/wp-json/wp/v2/apod-basic`](https://science.nasa.gov/wp-json/wp/v2/apod-basic), which replaces the old `api.nasa.gov/planetary/apod` endpoint (archived on 1 December 2026). The worker reads the newest 25 entries, newest first. The image comes from `hdurl` (a still on video days), and the HTML title, explanation and credit are turned into plain text. Pictures with a copyright holder are shown with their credit, as NASA's own site does. Only images on `nasa.gov` hosts are passed through, and the NASA logo the feed returns when it can't find a picture is skipped.

**Bing** comes from `bing.com/HPImageArchive.aspx` (the last 8 days). Images are requested by their `OHR.` id at a fixed set of sizes: 400×240 for thumbnails, 1920×1080, UHD, and 1080×1920 for phones.

Anything else sent to the image route gets a `400`. The worker only accepts `GET` and `HEAD`.

---

## How it fits together

| File | What it does |
|---|---|
| `index.html` | The page: poster layout, sheets and modals |
| `about.html`, `about.css` | The About page at `/about`: who runs the site and how to get in touch |
| `styles.css` | All styles. Tokens at the top; `data-tone="light"` flips them for bright pictures |
| `boot.js` | Runs before first paint and re-applies the last picture's colours, so nothing flashes |
| `app.js` | Search and shortcuts, clock, timer, tasks, history, sounds, painted scenes, picture of the day, pop-out timer |
| `worker.js` | The two picture routes above |
| `sw.js` | Caches the app shell for offline use and handles notification clicks |
| `_headers` | Security headers and the Content Security Policy (everything is same-origin) |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Open to all search engines and AI crawlers; `llms.txt` is a short summary for AI assistants |
| `fonts/` | Bodoni Moda for the numerals and headings, Schibsted Grotesk for everything else |
| `icons/`, `favicon.svg` | The triquetra mark at app-icon sizes |

When you change `styles.css`, `app.js` or `boot.js`, bump its `?v=` number in `index.html` and the matching entry in `sw.js`, and bump `CACHE` in `sw.js`, so returning visitors get the new files. When the worker's picture list changes shape, bump `PICTURE_FEED_VERSION` in `app.js` so browsers skip the old cached list.

## Search engines and AI assistants

Every crawler is allowed, search engines and AI alike. Both pages carry schema.org data (`WebSite` and `Person` on the homepage, `ProfilePage` on `/about`) so search results and AI answers tie the site to its author. The worker marks its own responses `noindex`, so the picture list and passed-through images stay out of search results.

To get indexed sooner, add the site to [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters) (Bing's index also feeds ChatGPT search and Copilot), then submit `https://lokeshtewari.uk/sitemap.xml` in each.

## Using it as your homepage

Set `https://lokeshtewari.uk` as the homepage or new-tab page in your browser. Chrome and Edge: Settings → On startup → Open a specific page. Firefox: Settings → Home → Homepage and new windows → Custom URLs. Safari: Settings → General → Homepage. Use `https://lokeshtewari.uk/#focus` to open on the timer instead.

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
