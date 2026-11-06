import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Pages framing policy covers every static route without restricting existing resource loads", async () => {
  const source = await readFile(new URL("public/_headers", root), "utf8");
  const lines = source.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
  assert.equal(lines.shift(), "/*", "All static routes, including deep links, must be protected");
  const headers = new Map();
  for (const line of lines) {
    assert.match(line, /^\s+[^:]+:/, "Pages headers must be indented");
    const colon = line.indexOf(":");
    const name = line.slice(0, colon).trim().toLowerCase();
    assert.ok(!headers.has(name), "Duplicate headers would be combined by Pages");
    headers.set(name, line.slice(colon + 1).trim());
  }
  assert.equal(headers.get("x-frame-options"), "DENY");
  const policy = headers.get("content-security-policy");
  assert.ok(policy, "An enforced CSP is required");
  const directives = new Map();
  for (const directive of policy
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const [name, ...values] = directive.split(/\s+/);
    assert.ok(!directives.has(name), "Duplicate CSP directives must not hide a policy mistake");
    directives.set(name, values.join(" "));
  }
  assert.equal(directives.get("frame-ancestors"), "'none'");
  assert.equal(directives.get("object-src"), "'none'");
  assert.equal(directives.get("base-uri"), "'self'");
  // A stricter resource policy needs separate browser testing of hydration,
  // WebGL, inline styles and Cloudflare email/bot/analytics script injection.
  assert.deepEqual([...directives.keys()].sort(), ["base-uri", "frame-ancestors", "object-src"]);
});

test("the static build publishes the reviewed Pages header rules unchanged", async () => {
  assert.equal(
    await readFile(new URL("dist-static/_headers", root), "utf8"),
    await readFile(new URL("public/_headers", root), "utf8"),
  );
});
