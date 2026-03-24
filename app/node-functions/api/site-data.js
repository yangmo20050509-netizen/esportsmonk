import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSiteData } from "../../../scripts/build-site-data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackPath = path.resolve(__dirname, "../../data/site-data.json");
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheBucket() {
  if (!globalThis.__ESPORTS_MONK_SITE_DATA_CACHE__) {
    globalThis.__ESPORTS_MONK_SITE_DATA_CACHE__ = {
      expiresAt: 0,
      payload: null,
    };
  }

  return globalThis.__ESPORTS_MONK_SITE_DATA_CACHE__;
}

async function loadFallbackSiteData() {
  const raw = await readFile(fallbackPath, "utf8");
  return JSON.parse(raw);
}

function jsonResponse(body, options = {}) {
  const status = options.status || 200;
  const extraHeaders = options.headers || {};

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=300",
      ...extraHeaders,
    },
  });
}

export async function onRequestGet(context) {
  const cache = getCacheBucket();
  const now = Date.now();

  if (cache.payload && cache.expiresAt > now) {
    return jsonResponse(cache.payload, {
      headers: {
        "x-esportsmonk-source": "memory-cache",
      },
    });
  }

  try {
    const payload = await generateSiteData({
      persist: false,
      runtimeEnv: context?.env || {},
    });

    cache.payload = payload;
    cache.expiresAt = now + CACHE_TTL_MS;

    return jsonResponse(payload, {
      headers: {
        "x-esportsmonk-source": "live-build",
      },
    });
  } catch (error) {
    try {
      const fallback = cache.payload || (await loadFallbackSiteData());
      return jsonResponse(fallback, {
        headers: {
          "x-esportsmonk-source": "static-fallback",
          "x-esportsmonk-error": String(error?.message || error || "unknown"),
        },
      });
    } catch (fallbackError) {
      return jsonResponse(
        {
          ok: false,
          error: "site-data-unavailable",
          message: String(error?.message || error || fallbackError?.message || "unknown"),
        },
        {
          status: 500,
          headers: {
            "x-esportsmonk-source": "error",
          },
        },
      );
    }
  }
}

export default onRequestGet;
