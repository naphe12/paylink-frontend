import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const indexPath = path.join(distDir, "index.html");
const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function normalizeUrlPath(url = "/") {
  try {
    const parsed = new URL(url, "http://localhost");
    return decodeURIComponent(parsed.pathname);
  } catch {
    return "/";
  }
}

function toSafeDistPath(urlPath) {
  const relativePath = urlPath.replace(/^\/+/, "");
  const resolved = path.resolve(distDir, relativePath);
  if (!resolved.startsWith(distDir)) return null;
  return resolved;
}

function writeCommonHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
}

async function sendFile(res, filePath, { cacheControl } = {}) {
  const data = await fs.readFile(filePath);
  writeCommonHeaders(res, filePath);
  if (cacheControl) res.setHeader("Cache-Control", cacheControl);
  res.statusCode = 200;
  res.end(data);
}

function sendText(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const urlPath = normalizeUrlPath(req.url);
  const isAssetPath = urlPath.startsWith("/assets/");
  const safePath = toSafeDistPath(urlPath);

  if (!safePath) {
    sendText(res, 400, "Invalid path");
    return;
  }

  try {
    const stat = await fs.stat(safePath);
    if (stat.isFile()) {
      const cacheControl = isAssetPath
        ? "public, max-age=31536000, immutable"
        : path.basename(safePath) === "index.html"
          ? "no-cache, must-revalidate"
          : "public, max-age=3600";
      await sendFile(res, safePath, { cacheControl });
      return;
    }
  } catch {
    // File does not exist: continue with routing logic below.
  }

  if (isAssetPath) {
    // Important: never fallback assets to index.html, otherwise MIME mismatch breaks app.
    sendText(res, 404, "Asset not found");
    return;
  }

  try {
    await sendFile(res, indexPath, { cacheControl: "no-cache, must-revalidate" });
  } catch {
    sendText(res, 500, "Frontend build not found. Run: npm run build");
  }
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Frontend server running on http://${host}:${port}`);
});
