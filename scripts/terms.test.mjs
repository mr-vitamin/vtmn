import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { startStaticServer } from "./serve-static.mjs";

test("terms are directly accessible with metadata, license boundaries and shared legal links", async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (let visit = 0; visit < 2; visit++) {
      const response = await fetch(`${base}/terms`);
      assert.equal(response.status, 200, "Direct visit and refresh");
      const dom = new JSDOM(await response.text());
      const doc = dom.window.document;
      assert.equal(doc.title, "Terms of Use — VTMN");
      assert.equal(doc.documentElement.lang, "en");
      assert.equal(doc.querySelectorAll("main h1").length, 1);
      assert.equal(doc.querySelector("main h1").textContent, "Terms of Use");
      assert.equal(doc.querySelector('link[rel="canonical"]').getAttribute("href"), "/terms");
      assert.ok(doc.querySelector('meta[name="description"]').content);
      assert.equal(doc.querySelectorAll("main section h2").length, 10);
      assert.ok(doc.querySelector('main a[href="https://www.apache.org/licenses/LICENSE-2.0"]'));
      const text = doc.querySelector("main").textContent;
      for (const phrase of [
        "Apache License 2.0",
        "All Rights Reserved",
        "third-party licenses",
        "does not add conditions",
        "Viewing this website alone",
        "applicable law",
        "Effective upon publication",
      ]) {
        assert.ok(text.includes(phrase), phrase);
      }
      assert.equal(doc.querySelectorAll("form,input,textarea,iframe").length, 0);
      dom.window.close();
    }
    const files = [
      "index",
      "archive",
      "about",
      "privacy",
      "terms",
      "archive/the-shrouded-reign-book-1",
      "archive/the-shrouded-reign-book-2",
      "archive/wet-paper-magazine-website",
      "archive/7-tools-in-7-days",
      "archive/wren-discord-bot",
      "archive/vtmn-website",
    ];
    for (const file of files) {
      const dom = new JSDOM(
        await readFile(new URL(`../dist-static/${file}.html`, import.meta.url), "utf8"),
      );
      const footer = dom.window.document.querySelector("footer");
      const legal = [...footer.querySelectorAll('a[href^="/"]')];
      assert.deepEqual(
        legal.map((a) => [a.textContent, a.getAttribute("href")]),
        [
          ["Privacy Policy", "/privacy"],
          ["Terms of Use", "/terms"],
        ],
        file,
      );
      assert.ok(footer.textContent.includes("© 2026 VTMN. All rights reserved."), file);
      assert.equal(
        footer.querySelectorAll('a[href="https://github.com/mr-vitamin"]').length,
        1,
        file,
      );
      dom.window.close();
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
