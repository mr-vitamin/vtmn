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
  const image = "https://vtmnarchive.com/vtmn-social-preview.png";
  const alt =
    "VTMN horizontal lockup with its emblem, wordmark, and Esse Quam Videri motto on a dark background.";
  assert.equal(meta(document, "og:image"), image);
  assert.equal(meta(document, "og:image:width"), "1200");
  assert.equal(meta(document, "og:image:height"), "630");
  assert.equal(meta(document, "og:image:alt"), alt);
  assert.equal(meta(document, "twitter:image"), image);
  assert.equal(meta(document, "twitter:image:alt"), alt);
});

test("the exported social image is an optimized 1200 by 630 PNG without embedded source metadata", async () => {
  const image = await readFile(new URL("../dist-static/vtmn-social-preview.png", import.meta.url));
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(image.length < 100_000);
  for (let offset = 8; offset < image.length;) {
    const length = image.readUInt32BE(offset);
    const type = image.toString("ascii", offset + 4, offset + 8);
    assert.ok(
      !["eXIf", "tEXt", "zTXt", "iTXt"].includes(type),
      `Unexpected source metadata: ${type}`,
    );
    offset += length + 12;
  }
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
