/**
 * Cloudflare Worker backend
 * Serves the picture of the day (NASA's Astronomy Picture of the Day, or Bing's) through
 * this site, so visitors' browsers never contact a third party and the page can read
 * each photo's colours. Everything else is static.
 */

const CONFIG = {
  LIST_TTL_S: 1800,          // photos change once a day; check every half hour
  IMAGE_TTL_S: 7 * 86400,    // image URLs never change content
  BING_ORIGIN: "https://www.bing.com",
  BING_DEFAULT_MARKET: "en-US",
  BING_DAYS: 8,
  BING_RESOLUTIONS: ["UHD", "1920x1080", "1080x1920", "400x240"],
  BING_ID: /^OHR\.[A-Za-z0-9_-]{1,120}$/,
  // NASA's APOD feed (the old api.nasa.gov endpoint is being archived); newest 25 entries
  APOD_API: "https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=25",
  APOD_IMAGE_HOST: /(^|\.)nasa\.gov$/i, // science.nasa.gov, assets.science.nasa.gov, apod.nasa.gov, …
  USER_AGENT: "0bsidian/1.0 (+https://lokeshtewari.uk)",
};

class HttpUtils {
  static jsonResponse(body, status = 200, extraHeaders = {}) {
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "no-store",
      ...extraHeaders,
    });
    return new Response(JSON.stringify(body), { status, headers });
  }

  // Serve from the edge cache, or build the response and cache it
  static async cached(request, ctx, build) {
    const cache = caches.default;
    const key = new Request(request.url); // GET key, so HEAD requests share the entry
    const hit = await cache.match(key);
    if (hit) return hit;
    const response = await build();
    if (response.ok) ctx.waitUntil(cache.put(key, response.clone()));
    return response;
  }

  static async proxyImage(url) {
    const upstream = await fetch(url, { headers: { "Accept": "image/*", "User-Agent": CONFIG.USER_AGENT } });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return HttpUtils.jsonResponse({ error: "Photo not found" }, 404);
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": `public, max-age=${CONFIG.IMAGE_TTL_S}, immutable`,
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  }
}

const imageUrl = (params) => `/api/wallpaper/image?${new URLSearchParams(params)}`;
const clip = (text, max) => (typeof text === "string" ? text.trim().slice(0, max) : "");

class Bing {
  static market(env) {
    const mkt = env?.BING_MARKET;
    return typeof mkt === "string" && /^[a-z]{2}-[A-Z]{2}$/.test(mkt) ? mkt : CONFIG.BING_DEFAULT_MARKET;
  }

  // "Some place, Some country (© Photographer/Agency)" → caption and credit
  static splitCopyright(text) {
    const match = /^(.*?)\s*\((©[^)]*)\)\s*$/.exec(text || "");
    return match ? { caption: match[1], credit: match[2] } : { caption: text || "", credit: "" };
  }

  static async list(env) {
    const url = `${CONFIG.BING_ORIGIN}/HPImageArchive.aspx?format=js&idx=0&n=${CONFIG.BING_DAYS}&mkt=${Bing.market(env)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`Bing ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data?.images) ? data.images : []).map(Bing.parse).filter(Boolean);
  }

  static parse(img) {
    const query = (img?.urlbase || "").split("?")[1] || "";
    const id = new URLSearchParams(query).get("id");
    if (!id || !CONFIG.BING_ID.test(id)) return null;
    const src = (res) => imageUrl({ source: "bing", id, res });
    return {
      id: `bing:${id}`,
      date: /^\d{8}$/.test(img.startdate || "") ? img.startdate : null,
      title: clip(img.title, 200),
      ...Bing.splitCopyright(clip(img.copyright, 400)),
      link: typeof img.copyrightlink === "string" && img.copyrightlink.startsWith(`${CONFIG.BING_ORIGIN}/`) ? img.copyrightlink : null,
      src: { thumb: src("400x240"), sd: src("1920x1080"), hd: src("UHD"), portrait: src("1080x1920") },
    };
  }

  static image(params) {
    const id = params.get("id") || "";
    const res = params.get("res") || "1920x1080";
    if (!CONFIG.BING_ID.test(id) || !CONFIG.BING_RESOLUTIONS.includes(res)) return null;
    return `${CONFIG.BING_ORIGIN}/th?id=${id}_${res}.jpg`;
  }
}

class Apod {
  // The feed's text fields are HTML; reduce them to plain text
  static text(html, max) {
    if (typeof html !== "string") return "";
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m)
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim()
      .slice(0, max);
  }

  // The first sentence of NASA's explanation, as a caption
  static firstSentence(text) {
    const match = /^(.{20,220}?[.?!])(\s|$)/.exec(text);
    if (match) return match[1];
    return text.length > 180 ? `${text.slice(0, 180).replace(/\s+\S*$/, "")}…` : text;
  }

  // Only images on NASA's own hosts are passed through; the proxy also checks the
  // response really is an image
  static imageSource(raw) {
    if (typeof raw !== "string" || raw.length > 500) return null;
    let url;
    try { url = new URL(raw.replace(/^http:/, "https:")); } catch { return null; }
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!CONFIG.APOD_IMAGE_HOST.test(url.hostname)) return null;
    // The site header's logo, which the feed returns when it can't find the picture
    if (/nasa-logo|\/themes\//i.test(url.pathname)) return null;
    url.hash = "";
    return url.toString();
  }

  static async list() {
    const res = await fetch(CONFIG.APOD_API, {
      headers: { "Accept": "application/json", "User-Agent": CONFIG.USER_AGENT },
    });
    if (!res.ok) throw new Error(`APOD ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .map(Apod.parse)
      .filter(Boolean)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 12);
  }

  static parse(d) {
    if (!d || typeof d !== "object") return null;
    // hdurl is the full image (a still frame on video days); url is usually the article
    const image = Apod.imageSource(d.hdurl) || Apod.imageSource(d.url);
    if (!image) return null;
    const ymd = /(\d{4})-(\d{2})-(\d{2})/.exec(String(d.date || ""));
    const compact = ymd ? `${ymd[1]}${ymd[2]}${ymd[3]}` : null;
    const src = imageUrl({ source: "apod", u: image });
    const link = [d.permalink, d.url, d.basic_html_url].find(l => typeof l === "string" && /^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//i.test(l))
      || (compact ? `https://apod.nasa.gov/apod/ap${compact.slice(2)}.html` : "https://apod.nasa.gov/apod/");
    const credit = Apod.text(d.credit, 160).replace(/^(image\s+)?credits?(\s*(and|&)\s*copyright)?\s*:\s*/i, "");
    const holder = Apod.text(d.copyright, 120);
    const owned = holder && !/public domain/i.test(holder) && !credit.toLowerCase().includes(holder.toLowerCase());
    const creditLine = [credit && `Image: ${credit}`, owned && `© ${holder}`].filter(Boolean).join(" · ") || "Image: NASA";
    const video = String(d.media_type || "").toLowerCase() === "video";
    const caption = Apod.firstSentence(Apod.text(d.explanation, 1500));
    return {
      id: `apod:${compact || d.post_id || image.slice(-48)}`,
      date: compact,
      title: Apod.text(d.title, 200),
      caption: video ? `${caption} (A video on NASA's site; this is a still from it.)` : caption,
      credit: `${creditLine}.`,
      link,
      src: { thumb: src, sd: src, hd: src, portrait: src },
    };
  }

  static image(params) {
    return Apod.imageSource(params.get("u") || "");
  }
}

const SOURCES = { apod: Apod, bing: Bing };

class ApiController {
  static async handleWallpaperList(request, env, ctx) {
    const source = SOURCES[new URL(request.url).searchParams.get("source") || "apod"];
    if (!source) return HttpUtils.jsonResponse({ error: "Unknown source" }, 400);
    return HttpUtils.cached(request, ctx, async () => {
      try {
        const images = await source.list(env);
        if (images.length === 0) return HttpUtils.jsonResponse({ error: "No photos" }, 502);
        return HttpUtils.jsonResponse({ images }, 200, { "Cache-Control": `public, max-age=${CONFIG.LIST_TTL_S}` });
      } catch {
        return HttpUtils.jsonResponse({ error: "Photo service unavailable" }, 502);
      }
    });
  }

  static async handleWallpaperImage(request, env, ctx) {
    const params = new URL(request.url).searchParams;
    const source = SOURCES[params.get("source")];
    const upstream = source?.image(params);
    if (!upstream) return HttpUtils.jsonResponse({ error: "Unknown photo" }, 400);
    return HttpUtils.cached(request, ctx, async () => {
      try {
        return await HttpUtils.proxyImage(upstream);
      } catch {
        return HttpUtils.jsonResponse({ error: "Photo service unavailable" }, 502);
      }
    });
  }
}

// Main Request Router
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return HttpUtils.jsonResponse({ error: "Method not allowed" }, 405, { "Allow": "GET, HEAD" });
    }

    switch (new URL(request.url).pathname) {
      case "/api/wallpaper":
        return ApiController.handleWallpaperList(request, env, ctx);
      case "/api/wallpaper/image":
        return ApiController.handleWallpaperImage(request, env, ctx);
      default:
        return HttpUtils.jsonResponse({ error: "Not found" }, 404);
    }
  },
};
