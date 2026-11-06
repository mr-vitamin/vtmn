import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { startStaticServer } from "./serve-static.mjs";

test("privacy notice is directly accessible, accurate, and reachable from the footer", async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/privacy`);
    assert.equal(response.status, 200);
    const dom = new JSDOM(await response.text());
    const doc = dom.window.document;
    assert.equal(doc.querySelector("main h1")?.textContent, "Privacy notice");
    const text = doc.querySelector("main").textContent;
    for (const term of [
      "Utah, USA",
      "Cloudflare",
      "Web Analytics",
      "security cookies",
      "reasonably necessary",
      "records controlled by Cloudflare",
    ]) {
      assert.ok(text.includes(term), term);
    }
    assert.equal(
      doc.querySelector('main a[href="mailto:alexanderceran1@gmail.com"]')?.textContent,
      "alexanderceran1@gmail.com",
    );
    assert.equal(doc.querySelectorAll("form,input,textarea,iframe").length, 0);
    dom.window.close();
    for (const file of [
      "index.html",
      "archive.html",
      "about.html",
      "privacy.html",
      "archive/wren-discord-bot.html",
    ]) {
      const page = new JSDOM(
        await readFile(new URL(`../dist-static/${file}`, import.meta.url), "utf8"),
      );
      assert.equal(
        page.window.document.querySelector('footer a[href="/privacy"]')?.textContent,
        "Privacy",
        file,
      );
      page.window.close();
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
