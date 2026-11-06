// Executes the exported browser bundles in a DOM harness, not a browser or SSR server.
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { JSDOM, ResourceLoader, VirtualConsole } from "jsdom";
import { startStaticServer } from "./serve-static.mjs";

const waitFor = async (predicate, label) => {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(`Timed out: ${label}`);
};

async function hydrate(base, route, { reducedMotion = false, canvas = false, mobile = true } = {}) {
  const errors = [];
  const requests = [];
  const response = await fetch(base + route);
  class StaticResources extends ResourceLoader {
    fetch(url, options) {
      // Fonts are external in the real site; layout is outside this DOM test.
      if (!url.startsWith(base + "/")) return Promise.resolve(Buffer.from(""));
      return super.fetch(url, options);
    }
  }
  const console = new VirtualConsole();
  console.on("jsdomError", (error) => {
    // jsdom 20 cannot parse modern Tailwind CSS (@layer/OKLCH). HTTP tests
    // verify the real stylesheet; visual CSS behavior needs a real browser.
    if (error.type !== "css parsing") errors.push(error.message);
  });
  console.on("error", (...args) => errors.push(args.join(" ")));
  const dom = new JSDOM(await response.text(), {
    url: base + route,
    runScripts: "dangerously",
    resources: new StaticResources(),
    pretendToBeVisual: true,
    virtualConsole: console,
    beforeParse(window) {
      // React waits for route stylesheet preloads before committing navigation.
      // jsdom 20 does not load rel=preload; bridge only that browser boundary
      // using real same-origin HTTP responses, never an unconditional load.
      const preloadedStyles = new WeakSet();
      const preloadObserver = new window.MutationObserver(() => {
        for (const link of window.document.querySelectorAll('link[rel="preload"][as="style"]')) {
          if (preloadedStyles.has(link)) continue;
          preloadedStyles.add(link);
          void (async () => {
            try {
              const url = new URL(link.href, window.location.href);
              assert.equal(url.origin, base, "Stylesheet preloads must remain local");
              requests.push(url.pathname);
              const response = await fetch(url);
              assert.equal(response.status, 200, `Stylesheet preload ${url.pathname}`);
              assert.match(response.headers.get("content-type"), /text\/css/);
              await response.arrayBuffer();
              link.dispatchEvent(new window.Event("load"));
            } catch (error) {
              errors.push(String(error));
              link.dispatchEvent(new window.Event("error"));
            }
          })();
        }
      });
      preloadObserver.observe(window.document, { childList: true, subtree: true });
      const close = window.close.bind(window);
      window.close = () => {
        preloadObserver.disconnect();
        close();
      };
      // Simulate only the rendering API boundary. These DOM tests exercise the
      // actual exported controller/controls, not GPU pixels or visual quality.
      window.HTMLCanvasElement.prototype.getContext = () =>
        canvas
          ? {
              setTransform() {},
              clearRect() {},
              beginPath() {},
              moveTo() {},
              lineTo() {},
              stroke() {},
              arc() {},
              ellipse() {},
              fill() {},
              createRadialGradient: () => ({ addColorStop() {} }),
            }
          : null;
      Object.assign(window, {
        Request,
        Response,
        Headers,
        TextEncoder,
        TextDecoder,
        structuredClone,
        ReadableStream,
        WritableStream,
        TransformStream,
        ByteLengthQueuingStrategy,
        CountQueuingStrategy,
        AbortController,
        AbortSignal,
        fetch: (input, init) => {
          const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
          assert.equal(url.origin, base, "The exported application must not call an external API");
          requests.push(url.pathname);
          return fetch(url, init);
        },
        scrollTo() {},
        matchMedia: (media) => ({
          matches: media === "(prefers-reduced-motion: reduce)" ? reducedMotion : media === "(min-width: 1024px) and (hover: hover) and (pointer: fine)" ? !mobile : false,
          media,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
        }),
      });
      window.performance.measure = () => {};
    },
  });
  const context = dom.getInternalVMContext();
  const modules = new Map();
  const linker = (specifier, referencing) => load(new URL(specifier, referencing.identifier).href);
  async function load(url) {
    assert.equal(new URL(url).origin, base);
    if (!modules.has(url))
      modules.set(
        url,
        (async () => {
          requests.push(new URL(url).pathname);
          const result = await fetch(url);
          assert.equal(result.status, 200, `Exported module ${url}`);
          return new vm.SourceTextModule(await result.text(), {
            context,
            identifier: url,
            initializeImportMeta(meta) {
              meta.url = url;
            },
            importModuleDynamically: async (specifier, referencing) => {
              const module = await linker(specifier, referencing);
              if (module.status === "unlinked") await module.link(linker);
              if (module.status === "linked") await module.evaluate();
              return module;
            },
          });
        })(),
      );
    return modules.get(url);
  }
  const entry = dom.window.document.querySelector('script[type="module"][src]');
  assert.ok(entry, "Static HTML must reference the exported client entry");
  const module = await load(new URL(entry.src, base).href);
  await module.link(linker);
  await module.evaluate();
  await waitFor(
    () => !dom.window.$_TSR,
    `hydration bootstrap; errors=${errors.join(" | ")}; modules=${modules.size}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { dom, errors, requests, status: response.status };
}

const click = (window, element) => {
  assert.ok(element, "Expected an interactive element");
  element.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
  );
};

test(
  "exported client preserves catalog order, project links, return navigation, and menu controls",
  { timeout: 30_000 },
  async () => {
    const server = await startStaticServer({ port: 0 });
    const base = `http://127.0.0.1:${server.address().port}`;
    let page;
    try {
      page = await hydrate(base, "/archive");
      const window = page.dom.window;
      const doc = window.document;
      const cards = [...doc.querySelectorAll("article")];
      assert.deepEqual(cards.map((card) => card.dataset.projectId), [
        "shrouded-reign-book-1", "shrouded-reign-book-2", "wet-paper-website",
        "7-tools-7-days", "wren-discord-bot", "vtmn-website",
      ]);
      assert.deepEqual([...doc.querySelectorAll('main h2')].map((h) => h.textContent), ["Upcoming", "Released"]);
      assert.ok(!doc.querySelector('[aria-label="Filter by category"]'));
      const action = cards[0].querySelector('a[href]');
      assert.equal(action.getAttribute('href'), '/archive/the-shrouded-reign-book-1');
      assert.ok(cards.every((card) => card.querySelector('a[href^="/archive/"]')));
      action.focus();
      assert.equal(doc.activeElement, action);
      click(window, action);
      await waitFor(() => doc.querySelector('main h1')?.textContent === 'The Shrouded Reign — Book 1', 'card navigation to exhibit');
      assert.equal(window.location.pathname, '/archive/the-shrouded-reign-book-1');
      assert.ok(doc.querySelector('[data-project-exhibit]'));
      click(window, [...doc.querySelectorAll('main a')].find(a => a.textContent.includes('Back to The Archive')));
      await waitFor(() => doc.querySelectorAll('article').length === 6, 'return to Archive');
      assert.equal(doc.querySelectorAll('article').length, 6);
      assert.ok(doc.querySelector('[data-archive-group="released"]').textContent.includes('No released projects yet.'));
      click(window, doc.querySelector('nav[aria-label="Main"] a[href="/about"]'));
      await waitFor(() => doc.title.startsWith("About "), "client navigation to About");
      assert.equal(window.location.pathname, "/about");
      click(window, doc.querySelector('button[aria-label="Open menu"]'));
      await waitFor(() => doc.querySelector('nav[aria-label="Mobile"]'), "mobile menu control");
      click(window, doc.querySelector('nav[aria-label="Mobile"] a[href="/"]'));
      await waitFor(
        () => doc.querySelector("h1")?.getAttribute("aria-label") === "VTMN",
        "mobile navigation to Home",
      );
      assert.ok(!doc.querySelector('nav[aria-label="Mobile"]'));
      assert.ok(
        !doc.querySelector('[aria-label="VTMN entrance"]'),
        "Direct Archive visits bypass the entrance even after navigation to Home",
      );
      assert.ok(
        !page.requests.some((url) => url.startsWith("/_server")),
        "No server-function requests",
      );
      assert.deepEqual(page.errors, []);
    } finally {
      page?.dom.window.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test(
  "static 404 hydrates at arbitrary missing URLs and Go home recovers",
  { timeout: 30_000 },
  async () => {
    const server = await startStaticServer({ port: 0 });
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      for (const route of ["/missing-first", "/nested/missing-second"]) {
        const page = await hydrate(base, route);
        try {
          assert.equal(page.status, 404);
          assert.equal(page.dom.window.document.querySelector("h1")?.textContent, "404");
          click(
            page.dom.window,
            [...page.dom.window.document.querySelectorAll("a")].find(
              (a) => a.textContent === "Go home",
            ),
          );
          await waitFor(
            () => page.dom.window.document.querySelector("h1")?.getAttribute("aria-label") === "VTMN",
            "Go home from static 404",
          );
          assert.equal(page.dom.window.location.pathname, "/");
          page.dom.window.history.back();
          await waitFor(
            () => page.dom.window.document.querySelector("h1")?.textContent === "404",
            "client history navigation to missing page",
          );
          assert.equal(page.dom.window.location.pathname, route);
          assert.deepEqual(page.errors, []);
        } finally {
          page.dom.window.close();
        }
      }
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test("all six static project exhibits hydrate without a server and keep their real links", { timeout: 30_000 }, async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const slug of ["the-shrouded-reign-book-1", "the-shrouded-reign-book-2", "wet-paper-magazine-website", "7-tools-in-7-days", "wren-discord-bot", "vtmn-website"]) {
      const page = await hydrate(base, "/archive/" + slug);
      try {
        const doc = page.dom.window.document;
        assert.equal(page.status, 200);
        assert.ok(doc.querySelector('[data-project-exhibit]'));
        assert.ok(!doc.querySelector('[aria-label="VTMN entrance"]'));
        assert.ok(!page.requests.some(url => url.startsWith('/_server')));
        const links = [...doc.querySelectorAll('main a[target="_blank"]')];
        assert.equal(links.length, slug === '7-tools-in-7-days' ? 1 : 0);
        const back = [...doc.querySelectorAll('main a')].find(a => a.textContent.includes('Back to The Archive'));
        click(page.dom.window, back);
        await waitFor(() => doc.querySelectorAll('article[data-project-id]').length === 6, 'exhibit return navigation');
        assert.equal(page.dom.window.location.pathname, '/archive');
        assert.deepEqual(page.errors, []);
      } finally { page.dom.window.close(); }
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("client navigation to an unknown project uses the project boundary and returns without an entrance", { timeout: 30_000 }, async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/archive/missing-project', '/archive/missing/deeper']) {
      const page = await hydrate(base, '/archive/wren-discord-bot');
      try {
        const doc = page.dom.window.document;
        page.dom.window.history.pushState({}, '', route);
        page.dom.window.dispatchEvent(new page.dom.window.PopStateEvent('popstate'));
        await waitFor(() => doc.querySelector('main h1')?.textContent === 'Project not found', 'client project not-found boundary');
        const back = [...doc.querySelectorAll('main a')].find(a => a.textContent.includes('Back to The Archive'));
        click(page.dom.window, back);
        await waitFor(() => doc.querySelectorAll('article[data-project-id]').length === 6, 'Archive recovery from project 404');
        assert.ok(!doc.querySelector('[aria-label="VTMN entrance"]'));
        assert.deepEqual(page.errors, []);
      } finally { page.dom.window.close(); }
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("Home and About hydrate on direct static navigation", { timeout: 30_000 }, async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ["/", "/about"]) {
      const page = await hydrate(base, route);
      try {
        assert.equal(page.status, 200);
        if (route === "/") {
          const skip = page.dom.window.document.querySelector("[data-entrance-skip]");
          if (skip) click(page.dom.window, skip);
          await waitFor(
            () => !page.dom.window.document.querySelector('[aria-label="VTMN entrance"]'),
            "skip before using navigation",
          );
        } else {
          assert.ok(!page.dom.window.document.querySelector('[aria-label="VTMN entrance"]'));
        }
        click(
          page.dom.window,
          page.dom.window.document.querySelector('button[aria-label="Open menu"]'),
        );
        await waitFor(
          () => page.dom.window.document.querySelector('nav[aria-label="Mobile"]'),
          `${route} direct hydration`,
        );
        assert.deepEqual(page.errors, []);
      } finally {
        page.dom.window.close();
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("exported mobile, reduced-motion, unsupported WebGL and deep-link visits never request the 3D chunk", { timeout: 30_000 }, async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [route, options] of [
      ["/", { mobile: true, canvas: true }],
      ["/", { mobile: false, reducedMotion: true, canvas: true }],
      ["/", { mobile: false, canvas: false }],
      ["/archive", { mobile: false, canvas: true }],
      ["/about", { mobile: false, canvas: true }],
      ["/archive/wren-discord-bot", { mobile: false, canvas: true }],
    ]) {
      const page = await hydrate(base, route, options);
      try {
        const doc = page.dom.window.document;
        assert.equal(page.status, 200);
        assert.ok(!doc.querySelector('[aria-label="VTMN entrance"]'));
        assert.ok(!doc.querySelector("#vtmn-content").hasAttribute("inert"));
        assert.ok(doc.querySelector("main h1"));
        assert.ok(doc.querySelector('nav[aria-label="Main"]'));
        assert.ok(doc.querySelector("footer"));
        assert.ok(!page.requests.some(url => /\/assets\/IntroScene-[^/]+\.js$/.test(url)), "Bypassed visitors must not download the lazy animation bundle");
        assert.deepEqual(page.errors, []);
      } finally { page.dom.window.close(); }
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test("server HTML keeps real content accessible without JavaScript", async () => {
  const server = await startStaticServer({ port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  let dom;
  try {
    dom = new JSDOM(await (await fetch(base + "/")).text(), { url: base + "/" });
    const doc = dom.window.document;
    assert.ok(!doc.querySelector('[aria-label="VTMN entrance"]'));
    assert.ok(!doc.querySelector("#vtmn-content").hasAttribute("inert"));
    assert.ok(doc.querySelector("main h1"));
    assert.ok(doc.querySelector('nav[aria-label="Main"] a[href="/archive"]'));
    assert.ok(doc.querySelector("noscript").textContent.includes(".vtmn-electric-boot{display:none!important}"));
    assert.ok(!doc.querySelector('link[rel="modulepreload"][href*="IntroScene-"]'));
  } finally { dom?.window.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test(
  "Home actions reach Archive and About without replaying the entrance",
  { timeout: 30_000 },
  async () => {
    const server = await startStaticServer({ port: 0 });
    const base = `http://127.0.0.1:${server.address().port}`;
    let page;
    try {
      page = await hydrate(base, "/", { reducedMotion: true });
      const window = page.dom.window;
      const doc = window.document;
      const skip = doc.querySelector("[data-entrance-skip]");
      if (skip) click(window, skip);
      await waitFor(
        () => !doc.querySelector('[aria-label="VTMN entrance"]'),
        "skip intro for Home actions",
      );
      const action = (name) =>
        [...doc.querySelectorAll("main a")].find((a) => a.textContent.trim() === name);
      assert.ok(action("Behind VTMN"), "Home must offer the secondary About action");
      click(window, action("Explore the Archive"));
      await waitFor(
        () =>
          window.location.pathname === "/archive" &&
          doc.querySelector('[data-archive-group="upcoming"]'),
        "primary Home action",
      );
      assert.ok(doc.querySelector('[data-archive-group="upcoming"]'));
      click(window, doc.querySelector('nav[aria-label="Main"] a[href="/"]'));
      await waitFor(
        () => window.location.pathname === "/" && action("Behind VTMN"),
        "return to Home",
      );
      assert.ok(!doc.querySelector('[aria-label="VTMN entrance"]'));
      click(window, action("Behind VTMN"));
      await waitFor(
        () => window.location.pathname === "/about" && doc.querySelector("#founder-heading"),
        "secondary Home action",
      );
      assert.ok(doc.querySelector("#founder-heading"));
      assert.deepEqual(page.errors, []);
    } finally {
      page?.dom.window.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
