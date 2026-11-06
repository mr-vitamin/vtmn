import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

test("production preview serves all pages, assets, and the 404", { timeout: 60_000 }, async () => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));

  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const [command, ...args] = manifest.scripts.preview.split(/\s+/);
  const cliManifestPath = require.resolve(`${command}/package.json`);
  const cliManifest = JSON.parse(await readFile(cliManifestPath, "utf8"));
  const bin = typeof cliManifest.bin === "string" ? cliManifest.bin : cliManifest.bin[command];
  const child = spawn(
    process.execPath,
    [
      path.resolve(path.dirname(cliManifestPath), bin),
      ...args,
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: root,
      env: { ...process.env, CI: "true", npm_config_yes: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  const exited = once(child, "exit");
  const base = `http://127.0.0.1:${port}`;

  try {
    let ready = false;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Preview exited early: ${output}`);
      try {
        await fetch(base, { signal: AbortSignal.timeout(1000) });
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    assert.ok(ready, `Preview did not start: ${output}`);

    for (const [route, title] of [
      ["/", /^VTMN /],
      ["/archive", /^The Archive /],
      ["/about", /^About /],
    ]) {
      const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 200, `${route} must render successfully.\n${output}`);
      assert.match(response.headers.get("content-type"), /text\/html/);
      const html = await response.text();
      assert.match(html.match(/<title>(.*?)<\/title>/)?.[1] ?? "", title);
      assert.match(html, /<h1\b/);
      if (route === "/archive") {
        assert.match(html, /<article\b/);
        assert.ok(html.includes('data-archive-group="upcoming"'));
        assert.ok(html.includes('data-archive-group="released"'));
        assert.ok(html.includes('href="/archive/the-shrouded-reign-book-1"'));
        assert.ok(!html.includes("Project page coming soon."));
        assert.ok(html.includes("The Shrouded Reign"));
        assert.ok(html.includes("Literature"));
      }
      if (route === "/") {
        const stylesheet = html.match(/href="([^"]+\.css(?:\?[^"]*)?)"/);
        assert.ok(stylesheet, "Home must reference a built stylesheet");
        const asset = await fetch(new URL(stylesheet[1], base), {
          signal: AbortSignal.timeout(5000),
        });
        assert.equal(asset.status, 200);
        assert.match(asset.headers.get("content-type"), /text\/css/);
      }
    }
    const missing = await fetch(`${base}/preview-test-missing-route`, {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(missing.status, 404);
    assert.ok((await missing.text()).includes("Page not found"));
  } finally {
    child.kill();
    await exited;
  }
});
