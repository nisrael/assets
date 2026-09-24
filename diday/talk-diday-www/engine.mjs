import { Marp } from "@marp-team/marp-core";
import { deflateSync } from "node:zlib";

/**
 * Kroki server URL.
 *
 * Defaults to the public instance. To switch to a self-hosted server set the
 * environment variable before running any script:
 *
 *   KROKI_URL=https://kroki.example.com pnpm run dev
 *   KROKI_URL=https://kroki.example.com pnpm run build
 *
 * Or export it in your shell profile / CI environment.
 */
const KROKI_URL = process.env.KROKI_URL ?? "https://kroki.io";

/**
 * Diagram types Kroki understands.
 * Use the type name as the fenced-code-block language identifier in slides.md:
 *
 *   ```mermaid  ```plantuml  ```d2  ```graphviz  ```svgbob  …
 */
const KROKI_TYPES = new Set([
  "actdiag", "blockdiag", "bpmn", "bytefield",
  "c4plantuml", "d2", "dbml", "ditaa", "erd",
  "excalidraw", "graphviz", "mermaid", "nomnoml",
  "nwdiag", "packetdiag", "pikchr", "plantuml",
  "rackdiag", "seqdiag", "structurizr", "svgbob",
  "umlet", "vega", "vegalite", "wavedrom",
]);

/**
 * Kroki URL encoding: base64url-no-padding( zlib-deflate( utf8(source) ) )
 *
 * Kroki expects ZLIB-wrapped deflate (same as pako.deflate / Python zlib.compress),
 * not raw deflate. The base64 is then made URL-safe manually so the result
 * works as a plain URL path segment without any percent-encoding.
 */
function encodeKroki(source) {
  return deflateSync(Buffer.from(source, "utf-8"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export default class MarpWithKroki extends Marp {
  constructor(opts) {
    super({
      ...opts,
      html: true,
      emoji: { ...(opts?.emoji ?? {}), twemoji: { base: "assets/twemoji/" } },
    });

    this.markdown.core.ruler.push("kroki-diagrams", (state) => {
      for (const token of state.tokens) {
        const type = token.info?.trim().toLowerCase();
        if (token.type === "fence" && KROKI_TYPES.has(type)) {
          const src = `${KROKI_URL}/${type}/svg/${encodeKroki(token.content.trim())}`;
          token.type = "html_block";
          token.content = `<figure class="kroki">\n  <img src="${src}" alt="${type} diagram" />\n</figure>\n`;
        }
      }
    });
  }
}
