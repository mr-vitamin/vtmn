// Local verification tool only. This file is never copied into dist-static.
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export async function startStaticServer({
  directory = path.resolve(import.meta.dirname, "../dist-static"),
  port = 4174,
} = {}) {
  const root = await realpath(directory);
  const notFound = await readFile(path.join(root, "404.html"));
  async function resolveFile(relative) {
    try {
      const file = await realpath(path.join(root, relative));
      if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) return;
      return file;
    } catch (error) {
      if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
    }
  }
  async function closestNotFound(pathname) {
    let directory = path.posix.dirname(pathname);
    while (directory !== "/" && directory !== ".") {
      const file = await resolveFile(path.posix.join(directory, "404.html").slice(1));
      if (file) return readFile(file);
      directory = path.posix.dirname(directory);
    }
    return notFound;
  }
  const server = createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405, { Allow: "GET, HEAD" });
        res.end();
        return;
      }
      const url = new URL(req.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      const parts = pathname.split("/").filter(Boolean);
      const invalid = parts.some(
        (part) => part.startsWith(".") || part.includes("\\") || part.includes("\0"),
      );
      let file;
      if (!invalid && !["404", "404.html"].includes(parts.at(-1) ?? "")) {
        const clean = pathname.replace(/\/$/, "") || "/";
        const canonical = clean === "/index.html" ? "/" : clean.replace(/\.html$/, "");
        const target = canonical === "/" ? "index.html" : canonical.slice(1) + ".html";
        const html = await resolveFile(target);
        if (html) {
          if (pathname !== canonical) {
            res.writeHead(308, { Location: canonical + url.search });
            res.end();
            return;
          }
          file = html;
        } else file = await resolveFile(pathname.slice(1));
      }
      const body = file ? await readFile(file) : invalid ? notFound : await closestNotFound(pathname);
      res.writeHead(file ? 200 : 404, {
        "Content-Type": file
          ? (types[path.extname(file)] ?? "application/octet-stream")
          : types[".html"],
        "Content-Length": body.length,
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : 500);
      res.end("Static file request failed");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { values } = parseArgs({ options: { port: { type: "string", default: "4174" } } });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid port");
  const server = await startStaticServer({ port });
  console.log(`Static files only: http://127.0.0.1:${server.address().port}`);
}
