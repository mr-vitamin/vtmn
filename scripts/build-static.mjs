import assert from "node:assert/strict";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createBuilder } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const client = path.join(root, "dist/client");
const output = path.join(root, "dist-static");

const builder = await createBuilder({ root, configFile: path.join(root, "vite.static.config.ts") });
await builder.buildApp();

for (const [file, title] of [
  ["index.html", /^VTMN /],
  ["archive.html", /^The Archive /],
  ["about.html", /^About /],
]) {
  const html = await readFile(path.join(client, file), "utf8");
  assert.match(
    html.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
    title,
    `${file} must contain its prerendered page`,
  );
  assert.match(html, /<h1\b/);
}

// Cards and prerender paths both come from the catalog. Verify every linked
// project has real exhibit HTML before replacing a previously successful export.
const archive = await readFile(path.join(client, "archive.html"), "utf8");
const projectPaths = [...new Set([...archive.matchAll(/href="(\/archive\/[a-z0-9-]+)"/g)].map(match => match[1]))];
assert.ok(projectPaths.length > 0, "The Archive must link to its catalog exhibits");
for (const route of projectPaths) {
  const html = await readFile(path.join(client, route.slice(1) + ".html"), "utf8");
  assert.match(html, /data-project-exhibit=/, `${route} must be a real exhibit`);
  assert.ok(html.includes(`href="${route}"`), `${route} must have its canonical URL`);
}

// Render the real not-found response. No fake route returning 200 is added.
// The static host, not this build-time renderer, returns 404 for missing URLs.
const { default: handler } = await import(pathToFileURL(path.join(root, "dist/server/server.js")));
const response = await handler.fetch(
  new Request("http://localhost/__vtmn_static_not_found__"),
  {},
  {},
);
assert.equal(response.status, 404, "The existing not-found handler must return HTTP 404");
assert.match(response.headers.get("content-type"), /text\/html/);
const notFound = await response.text();
assert.ok(notFound.includes("Page not found"), "The existing not-found UI must be preserved");

// Cloudflare Pages selects the closest directory 404. Render the actual route's
// not-found response, rather than creating an index/SPA rewrite returning 200.
const projectResponse = await handler.fetch(
  new Request("http://localhost/archive/__vtmn_missing_project__"), {}, {},
);
assert.equal(projectResponse.status, 404, "Unknown project slugs must return HTTP 404");
// A dynamic route's serialized match belongs to its build-time slug. It cannot
// hydrate safely at every arbitrary missing slug. This error document is fully
// static: retain styles, semantics and ordinary return links, omit bootstrap JS.
const projectNotFound = (await projectResponse.text())
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<link\b(?=[^>]*\brel="modulepreload")[^>]*>/gi, "");
assert.ok(projectNotFound.includes("Project not found"));
assert.ok(projectNotFound.includes("Back to The Archive"));

const allowedExtensions = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".txt",
  ".xml",
  ".ico",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);
async function validate(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), `Symlinks are not deployment assets: ${entry.name}`);
    assert.ok(
      !["server", "functions", "node_modules", "_worker.js"].includes(entry.name),
      `Server artifact rejected: ${entry.name}`,
    );
    assert.ok(!entry.name.startsWith("."), `Hidden file rejected: ${entry.name}`);
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await validate(file);
    else
      assert.ok(
        allowedExtensions.has(path.extname(file)) || entry.name === "_headers",
        `Unexpected deployment file: ${entry.name}`,
      );
  }
}
await validate(client);

const staging = await mkdtemp(path.join(root, ".static-export-"));
try {
  await cp(client, staging, { recursive: true });
  await writeFile(path.join(staging, "404.html"), notFound);
  await mkdir(path.join(staging, "archive"), { recursive: true });
  await writeFile(path.join(staging, "archive/404.html"), projectNotFound);
  await validate(staging);
  const previous = await lstat(output).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  assert.ok(
    !previous || (previous.isDirectory() && !previous.isSymbolicLink()),
    "dist-static must be a real output directory",
  );
  // Both deletion targets are fixed/generated children of this repository.
  assert.equal(path.dirname(output), root);
  await rm(output, { recursive: true, force: true });
  await rename(staging, output);
} finally {
  assert.equal(path.dirname(staging), root);
  assert.ok(path.basename(staging).startsWith(".static-export-"));
  await rm(staging, { recursive: true, force: true });
}
console.log(
  "Static export ready: dist-static (HTML/CSS/JavaScript/assets only; no production server)",
);
