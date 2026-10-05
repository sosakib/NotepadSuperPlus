import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./render.ts";
import { buildExport } from "../actions/exportActions.ts";

const PAYLOADS = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `<svg><script>alert(1)</script></svg>`,
  `<svg onload=alert(1)>`,
  `<iframe src="javascript:alert(1)"></iframe>`,
  `<a href="javascript:alert(1)">x</a>`,
  `[x](javascript:alert(1))`,
  `[x](JaVaScRiPt:alert(1))`,
  `[x](&#106;avascript:alert(1))`,
  `<a href="data:text/html,<script>alert(1)</script>">x</a>`,
  `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`,
  `<form action="javascript:alert(1)"><button>x</button></form>`,
  `<object data="javascript:alert(1)"></object>`,
  `<embed src="javascript:alert(1)">`,
  `<meta http-equiv="refresh" content="0;url=https://evil.example">`,
  `<base href="https://evil.example/">`,
  `<link rel="stylesheet" href="https://evil.example/x.css">`,
  `<div style="background:url(https://evil.example/p)">x</div>`,
  `<input autofocus onfocus=alert(1)>`,
  `<details open ontoggle=alert(1)>`,
  "```js\n</code></pre><img src=x onerror=alert(1)>\n```",
  "```html\n<script>alert(1)</script>\n```",
  `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`,
];

const BAD_TAGS = "script,iframe,object,embed,meta,base,link,form,style,svg,math,noscript";

/** Parses like the preview's innerHTML does and reports any live dangerous markup. */
function liveThreats(html: string): string[] {
  const root = document.createElement("div");
  root.innerHTML = html;
  const found = [...root.querySelectorAll(BAD_TAGS)].map((e) => `<${e.localName}>`);
  for (const el of root.querySelectorAll("*")) {
    for (const { name, value } of el.attributes) {
      if (/^on/i.test(name) || name === "style") found.push(`${el.localName}[${name}]`);
      if (
        /^(href|src|action|data|formaction)$/.test(name) &&
        /^\s*(javascript|data|vbscript):/i.test(value)
      )
        found.push(`${el.localName}[${name}=${value}]`);
    }
  }
  return found;
}

describe("XSS regression net", () => {
  for (const p of PAYLOADS) {
    it(`sanitizes: ${p.slice(0, 50)}`, async () => {
      expect(liveThreats((await renderMarkdown(p)).html)).toEqual([]);
      const exported = await buildExport(p, "html", "t");
      expect(liveThreats(exported.split("<body>")[1]?.split("</body>")[0] ?? "")).toEqual([]);
    });
  }

  it("detector itself catches unsanitized payloads", () => {
    expect(
      liveThreats(`<img src=x onerror=alert(1)><a href="javascript:x">a</a><script></script>`),
    ).toHaveLength(3);
  });

  it("prefixes ids/names against DOM clobbering", async () => {
    const { html } = await renderMarkdown(`<img name="getElementById" id="root">`);
    expect(html).not.toMatch(/id="root"/);
    expect(html).not.toMatch(/name="getElementById"/);
  });

  it("escapes the export <title>", async () => {
    const out = await buildExport("x", "html", `</title><script>alert(1)</script>`);
    expect(out).not.toContain("<script>");
  });
});
