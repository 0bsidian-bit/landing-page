/**
 * Cloudflare Worker backend
 * Serves the photo of the day (NASA's Astronomy Picture of the Day, or Bing's) through
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
  APOD_API: "https://api.nasa.gov/planetary/apod",
  APOD_IMAGES: "https://apod.nasa.gov/apod/image/",
  APOD_DAYS: 21,             // look back far enough to find several public-domain images
  APOD_PATH: /^\d{4}\/[A-Za-z0-9._-]{1,140}\.(?:jpe?g|png)$/i,
};

class HttpUtils {
  static jsonResponse(body, status = 200, extraHeaders = {}) {
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
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
    const upstream = await fetch(url);
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return HttpUtils.jsonResponse({ error: "Photo not found" }, 404);
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": `public, max-age=${CONFIG.IMAGE_TTL_S}, immutable`,
        "X-Content-Type-Options": "nosniff",
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
  // The first sentence of NASA's explanation, as a caption
  static firstSentence(text) {
    const clean = clip(text, 1200).replace(/\s+/g, " ");
    const match = /^(.{20,220}?[.?!])(\s|$)/.exec(clean);
    if (match) return match[1];
    return clean.length > 180 ? `${clean.slice(0, 180).replace(/\s+\S*$/, "")}…` : clean;
  }

  static async list(env) {
    const key = typeof env?.NASA_API_KEY === "string" && env.NASA_API_KEY ? env.NASA_API_KEY : "DEMO_KEY";
    const start = new Date(Date.now() - CONFIG.APOD_DAYS * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`${CONFIG.APOD_API}?api_key=${encodeURIComponent(key)}&start_date=${start}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`APOD ${res.status}`);
    const data = await res.json();
    // Only images with no copyright holder listed, which NASA publishes as public domain
    return (Array.isArray(data) ? data : [])
      .filter(d => d && d.media_type === "image" && !d.copyright)
      .reverse()
      .map(Apod.parse)
      .filter(Boolean)
      .slice(0, 10);
  }

  static path(url) {
    if (typeof url !== "string" || !url.replace(/^http:/, "https:").startsWith(CONFIG.APOD_IMAGES)) return null;
    const path = url.replace(/^https?:\/\/apod\.nasa\.gov\/apod\/image\//, "");
    return CONFIG.APOD_PATH.test(path) ? path : null;
  }

  static parse(d) {
    const sd = Apod.path(d.url);
    if (!sd || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || "")) return null;
    const hd = Apod.path(d.hdurl) || sd;
    const src = (path) => imageUrl({ source: "apod", path });
    const compact = d.date.replace(/-/g, "");
    return {
      id: `apod:${sd}`,
      date: compact,
      title: clip(d.title, 200),
      caption: Apod.firstSentence(d.explanation),
      credit: "NASA, public domain",
      link: `https://apod.nasa.gov/apod/ap${compact.slice(2)}.html`,
      src: { thumb: src(sd), sd: src(sd), hd: src(hd), portrait: src(sd) },
    };
  }

  static image(params) {
    const path = params.get("path") || "";
    return CONFIG.APOD_PATH.test(path) ? `${CONFIG.APOD_IMAGES}${path}` : null;
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
