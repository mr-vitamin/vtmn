import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

async function documentFor(file) {
  return new JSDOM(await readFile(new URL(`../dist-static/${file}.html`, import.meta.url), "utf8"))
    .window.document;
}

function meta(document, key) {
  const tags = document.querySelectorAll(`meta[property="${key}"], meta[name="${key}"]`);
  assert.equal(tags.length, 1, `${key} must appear exactly once`);
  return tags[0].getAttribute("content");
}

test("homepage sharing metadata is available in static HTML without changing its document title", async () => {
  const document = await documentFor("index");
  const title = "VTMN | Esse Quam Videri";
  const description =
    "An independent collection of projects spanning technology, literature, and creative work. Built to create, explore, and document.";
  assert.equal(document.title, "VTMN — Independent Ideas & Creative Work");
  assert.equal(
    meta(document, "description"),
    "From digital systems to imagined worlds, VTMN brings independent ideas to life.",
  );
  assert.equal(meta(document, "og:title"), title);
  assert.equal(meta(document, "og:description"), description);
  assert.equal(meta(document, "twitter:title"), title);
  assert.equal(meta(document, "twitter:description"), description);
  assert.equal(meta(document, "twitter:card"), "summary_large_image");
  assert.equal(meta(document, "og:site_name"), "VTMN");
  assert.equal(meta(document, "og:url"), "https://vtmnarchive.com/");
  assert.equal(document.querySelector('link[rel="canonical"]').getAttribute("href"), "/");
  assert.equal(
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').length,
    0,
  );
});

test("existing Archive, About, Privacy Policy and Terms metadata stays page-specific", async () => {
  for (const [file, title, description] of [
    [
      "archive",
      "The Archive — VTMN",
      "The VTMN collection of creative and technical projects, released and upcoming.",
    ],
    [
      "about",
      "About — VTMN",
      "Behind VTMN: Alexander Ceran, the independent creator behind Mr Vitamin, and the philosophy of Esse Quam Videri.",
    ],
    [
      "privacy",
      "Privacy Policy — VTMN",
      "How VTMN handles website delivery, analytics and voluntary correspondence.",
    ],
    [
      "terms",
      "Terms of Use — VTMN",
      "Terms for visiting VTMN, including software licenses, reserved creative work and external links.",
    ],
  ]) {
    const document = await documentFor(file);
    assert.equal(document.title, title);
    assert.equal(meta(document, "description"), description);
    assert.equal(meta(document, "og:site_name"), "VTMN");
    assert.equal(document.querySelector('link[rel="canonical"]').getAttribute("href"), `/${file}`);
    assert.equal(
      document.querySelectorAll('meta[name="twitter:title"], meta[name="twitter:description"]')
        .length,
      0,
    );
    if (file === "archive" || file === "about") {
      assert.equal(meta(document, "og:title"), title);
      assert.equal(meta(document, "og:description"), description);
      assert.equal(meta(document, "og:url"), `/${file}`);
    } else {
      assert.equal(
        document.querySelectorAll(
          'meta[property="og:title"], meta[property="og:description"], meta[property="og:url"]',
        ).length,
        0,
      );
    }
  }
});
