import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { JSDOM } from "jsdom";

const output = path.resolve(import.meta.dirname, "../dist-static");

test("deployed files contain no editor telemetry or promotional integration", async () => {
  for (const name of await readdir(path.join(output, "assets"))) {
    if (!name.endsWith(".js")) continue;
    const code = await readFile(path.join(output, "assets", name), "utf8");
    assert.doesNotMatch(code, /__lovable|lovable\.(?:dev|app)|lovable\.js|gpteng\.co/i, name);
  }
  const html = await readFile(path.join(output, "index.html"), "utf8");
  assert.doesNotMatch(html, /lovable\.(?:dev|app)|gpteng\.co/i);
});

test("exported pages, assets, clean URLs, and genuine 404s work without an app server", async () => {
  for (const file of ["index.html", "archive.html", "about.html", "404.html"]) {
    const html = await readFile(path.join(output, file), "utf8").catch(() => "");
    assert.ok(
      html.startsWith("<!DOCTYPE html>") || html.startsWith("<!doctype html>"),
      `${file} must be prerendered`,
    );
  }
  const { startStaticServer } = await import("./serve-static.mjs");
  const server = await startStaticServer({ directory: output, port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [route, title] of [
      ["/", /^VTMN /],
      ["/archive", /^The Archive /],
      ["/about", /^About /],
    ]) {
      for (let visit = 0; visit < 2; visit++) {
        const response = await fetch(base + route);
        assert.equal(response.status, 200, `${route} direct visit/refresh`);
        const dom = new JSDOM(await response.text());
        const doc = dom.window.document;
        assert.match(doc.title, title);
        assert.ok(doc.querySelector("h1"));
        assert.ok(doc.querySelector('a[href="/archive"]'));
        assert.ok(doc.querySelector('a[href="/about"]'));
        const fonts = [...doc.querySelectorAll('link[rel="preload"][as="font"]')];
        assert.equal(fonts.length, 1, "One shared self-hosted Inter variable font");
        assert.ok(fonts[0].getAttribute("href").startsWith("/assets/"));
        const fontResponse = await fetch(new URL(fonts[0].getAttribute("href"), base));
        assert.equal(fontResponse.status, 200);
        assert.match(fontResponse.headers.get("content-type"), /font\/woff2/);
        assert.equal(Buffer.from(await fontResponse.arrayBuffer()).subarray(0, 4).toString(), "wOF2");
        assert.ok(![...doc.querySelectorAll('link[href]')].some((link) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(link.href)));
        const fontLicense = await fetch(base + "/fonts/Inter-OFL.txt");
        assert.equal(fontLicense.status, 200);
        assert.match(await fontLicense.text(), /SIL OPEN FONT LICENSE/);
        if (route === "/archive") {
          assert.equal(doc.querySelectorAll("article").length, 6);
          assert.deepEqual([...doc.querySelectorAll('main h2')].map((h) => h.textContent), ["Upcoming", "Released"]);
          assert.equal(doc.querySelectorAll('[data-archive-group="upcoming"] article').length, 6);
          assert.equal(doc.querySelectorAll('[data-archive-group="released"] article').length, 0);
          assert.ok(doc.querySelector('[data-archive-group="released"]').textContent.includes("No released projects yet."));
          assert.ok(!doc.querySelector('[aria-label="Filter by category"]'));
          assert.ok(!doc.body.textContent.includes("Sample"));
          assert.equal(doc.querySelectorAll('article [aria-disabled="true"]').length, 0);
          assert.equal(doc.querySelectorAll('article a[href^="/archive/"]').length, 6);
          assert.ok(!doc.body.textContent.includes("Project page coming soon."));
          assert.ok([...doc.querySelectorAll('link[rel="stylesheet"]')].some((link) => /^\/assets\/archive-[^/]+\.css$/.test(link.getAttribute('href'))));
        }
        if (route === "/about") {
          assert.ok([...doc.querySelectorAll('link[rel="stylesheet"]')].some((link) =>
            /^\/assets\/about-[^/]+\.css$/.test(link.getAttribute("href")),
          ), "Direct About visits include the page-specific editorial styles");
          const sections = [...doc.querySelectorAll("main section")];
          assert.deepEqual(sections.map((section) => section.querySelector("h1,h2")?.textContent), [
            "Behind VTMN", "About VTMN", "Esse Quam Videri",
          ]);
          assert.deepEqual(sections.map((section) => section.querySelectorAll("p").length), [4, 3, 6]);
          assert.equal(doc.querySelectorAll("main h1").length, 1);
          assert.equal(doc.querySelectorAll("main a,main button").length, 0);
          assert.deepEqual([...sections[2].querySelectorAll("em")].map((element) => element.textContent), [
            "To be rather than to seem.", "Esse Quam Videri",
          ]);
          const portrait = sections[0].querySelector("img");
          assert.match(portrait?.alt ?? "", /Alexander Ceran/);
          assert.equal(portrait.getAttribute("width"), "1327");
          assert.equal(portrait.getAttribute("height"), "1185");
          assert.match(portrait.getAttribute("src"), /^\/assets\/alexander-ceran-portrait-.*\.jpg$/);
          const photo = await fetch(new URL(portrait.getAttribute("src"), base));
          assert.equal(photo.status, 200);
          assert.match(photo.headers.get("content-type"), /image\/jpeg/);
          const photoBytes = Buffer.from(await photo.arrayBuffer());
          assert.equal(photoBytes.readUInt16BE(0), 0xffd8);
          assert.ok(photoBytes.length < 400_000, "Portrait is optimized for static delivery");
        }
        assert.equal(doc.querySelectorAll('link[rel~="icon"]').length, 4);
        if (route === "/") {
          assert.ok(doc.querySelector('h1 img[alt="VTMN — Esse Quam Videri"]'));
        }
        for (const element of doc.querySelectorAll('script[src],link[rel="stylesheet"],link[rel~="icon"],img[src]')) {
          const url = new URL(element.getAttribute("src") ?? element.getAttribute("href"), base);
          if (url.origin !== base) continue;
          const asset = await fetch(url);
          assert.equal(asset.status, 200, `asset ${url.pathname}`);
          if (url.pathname.endsWith(".css"))
            assert.match(asset.headers.get("content-type"), /text\/css/);
          if (url.pathname.endsWith(".js"))
            assert.match(asset.headers.get("content-type"), /javascript/);
          if (url.pathname.endsWith(".svg"))
            assert.match(asset.headers.get("content-type"), /image\/svg\+xml/);
          if (url.pathname.endsWith(".png"))
            assert.match(asset.headers.get("content-type"), /image\/png/);
        }
        dom.window.close();
      }
    }
    for (const route of [
      "/not-a-page",
      "/nested/missing",
      "/assets/missing.js",
      "/_server/missing",
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 404, `${route} must not fall back to a 200 homepage`);
      assert.ok((await response.text()).includes("Page not found"));
    }
    for (const [route, target] of [
      ["/archive.html", "/archive"],
      ["/about/", "/about"],
    ]) {
      const response = await fetch(base + route, { redirect: "manual" });
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), target);
    }
    const head = await fetch(base + "/archive", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    const files = await readdir(output, { recursive: true });
    assert.ok(
      !files.some((file) =>
        /(^|[/\\])(server|node_modules|functions|_worker\.js)([/\\]|$)|\.(mjs|map)$/.test(file),
      ),
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("all six exhibits are prerendered, refreshable, linked, and accompanied by a genuine Archive 404", async () => {
  const { startStaticServer } = await import("./serve-static.mjs");
  const server = await startStaticServer({ directory: output, port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  const entries = [
    ["the-shrouded-reign-book-1", "The Shrouded Reign — Book 1"],
    ["the-shrouded-reign-book-2", "The Shrouded Reign — Book 2"],
    ["wet-paper-magazine-website", "Wet Paper Magazine Website"],
    ["7-tools-in-7-days", "7 Tools in 7 Days"],
    ["wren-discord-bot", "Wren Discord Bot"],
    ["vtmn-website", "VTMN Website"],
  ];
  try {
    for (const [slug, title] of entries) {
      const route = "/archive/" + slug;
      for (let visit = 0; visit < 2; visit++) {
        const response = await fetch(base + route);
        assert.equal(response.status, 200, route + " direct visit/refresh");
        const dom = new JSDOM(await response.text());
        const doc = dom.window.document;
        assert.equal(doc.querySelector("main h1")?.textContent, title);
        assert.equal(doc.title, title + " — VTMN");
        assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute("href"), route);
        assert.equal(doc.querySelector('[property="og:title"]')?.getAttribute("content"), title + " — VTMN");
        assert.ok(doc.querySelector('meta[name="description"]')?.content.length > 20);
        assert.ok(doc.querySelector("[data-project-exhibit]"));
        const identity = doc.querySelector(".vtmn-exhibit-identity");
        assert.deepEqual([...identity.children].map(element => element.tagName), ["DIV", "H1"]);
        assert.ok(identity.children[0].classList.contains("vtmn-exhibit-metadata"));
        assert.equal(identity.querySelectorAll("p").length, 0, "No secondary labels on any hero");
        assert.equal(doc.querySelectorAll(".vtmn-exhibit-copy > p").length, 3);
        assert.equal(doc.querySelectorAll("main dl").length, 0, "Overview pages omit technical detail rows");
        const emphasis = slug.startsWith("the-shrouded-reign-") ? ["The Shrouded Reign"]
          : slug === "7-tools-in-7-days" ? ["7 Tools in 7 Days"] : [];
        assert.deepEqual([...doc.querySelectorAll(".vtmn-exhibit-copy em")].map(em => em.textContent), emphasis);
        assert.ok(!doc.querySelector("main").textContent.includes("Alexander Ceran"));
        if (slug === "wren-discord-bot") {
          assert.ok(doc.querySelector("main").textContent.includes("independent Discord bot"));
          assert.ok(!doc.querySelector("main").textContent.includes("Wet Paper Magazine"));
        }
        assert.ok(doc.querySelector('main a[href="/archive"]'));
        assert.equal(doc.querySelector(".vtmn-exhibit-status")?.textContent.trim(), "Upcoming");
        assert.ok(!doc.body.textContent.includes("Project page coming soon."));
        const stylesheet = [...doc.querySelectorAll('link[rel="stylesheet"]')].find(link => /\/project-detail-/.test(link.href));
        assert.ok(stylesheet, "Direct visits include the exhibit stylesheet");
        assert.equal((await fetch(new URL(stylesheet.href, base))).status, 200);
        const links = [...doc.querySelectorAll("main a[target='_blank']")];
        assert.equal(links.length, slug === "7-tools-in-7-days" ? 1 : 0);
        if (links.length) assert.equal(links[0].href, "https://github.com/mr-vitamin/7-tools-7-days");
        dom.window.close();
      }
      const canonical = await fetch(base + route + ".html", { redirect: "manual" });
      assert.equal(canonical.status, 308);
      assert.equal(canonical.headers.get("location"), route);
    }
    for (const missing of ["/archive/missing-project", "/archive/missing-project/", "/archive/missing/deeper", "/archive/404.html"]) {
      const response = await fetch(base + missing);
      assert.equal(response.status, 404);
      const dom = new JSDOM(await response.text());
      assert.equal(dom.window.document.querySelector("main h1")?.textContent, "Project not found");
      assert.ok(dom.window.document.querySelector('main a[href="/archive"]'));
      assert.equal(dom.window.document.querySelectorAll("script").length, 0, "Arbitrary slugs must not hydrate a build-time match");
      assert.equal(dom.window.document.querySelector('meta[name="robots"]')?.content, "noindex");
      dom.window.close();
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("every exported page shares the approved footer destinations and Amazon placeholder", async () => {
  const files = [
    "index.html",
    "about.html",
    "archive.html",
    "archive/the-shrouded-reign-book-1.html",
    "archive/the-shrouded-reign-book-2.html",
    "archive/wet-paper-magazine-website.html",
    "archive/7-tools-in-7-days.html",
    "archive/wren-discord-bot.html",
    "archive/vtmn-website.html",
  ];
  const destinations = [
    ["GitHub", "https://github.com/mr-vitamin"],
    ["Discord", "https://discord.com/users/1328588150326562917"],
    ["LinkedIn", "https://www.linkedin.com/in/alexander-ceran/"],
    ["Email", "mailto:alexanderceran1@gmail.com"],
  ];
  for (const file of files) {
    const dom = new JSDOM(await readFile(path.join(output, file), "utf8"));
    try {
      const footer = dom.window.document.querySelector("footer");
      assert.ok(footer, file);
      const items = [...footer.querySelectorAll("li")];
      assert.deepEqual(
        items.map((item) => item.textContent.trim()),
        ["GitHub", "Discord", "Amazon · soon", "LinkedIn", "Email"],
        file,
      );
      const links = [...footer.querySelector("ul").querySelectorAll("a")];
      assert.equal(links.length, 4, file);
      for (const [index, [label, href]] of destinations.entries()) {
        const link = links[index];
        assert.equal(link.textContent.trim(), label, file);
        assert.equal(link.getAttribute("href"), href, file);
        assert.equal(link.getAttribute("target"), label === "Email" ? null : "_blank", file);
        assert.equal(
          link.getAttribute("rel"),
          label === "Email" ? null : "noopener noreferrer",
          file,
        );
      }
      assert.equal(items[2].querySelector("a"), null, file);
      assert.equal(items[2].hasAttribute("tabindex"), false, file);
      assert.equal(items[2].title, "Link coming soon", file);
    } finally {
      dom.window.close();
    }
  }
});

test("export includes official symbol favicons at their declared sizes", async () => {
  const icon = new JSDOM(await readFile(path.join(output, "favicon.svg"), "utf8"), { contentType: "image/svg+xml" });
  assert.equal(icon.window.document.querySelectorAll("polygon").length, 7);
  assert.match(icon.window.document.querySelector("style").textContent, /prefers-color-scheme:dark/);
  icon.window.close();
  for (const size of [16, 32]) {
    const png = await readFile(path.join(output, `favicon-${size}.png`));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const ico = await readFile(path.join(output, "favicon.ico"));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2);
});
