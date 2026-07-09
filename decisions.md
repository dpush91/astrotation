# Decision Log

## 2026-07-09 — v0.2: capture outerHTML excerpt instead of a raster screenshot
**Context:** OPEN item was "screenshot attach" for annotation context. A real
pixel screenshot in-browser needs a heavy/flaky dep (dom-to-image via
SVG/foreignObject taints the canvas on cross-origin images, fonts miss).
**Options:** dom-to-image raster · Screen Capture API (permission-gated) ·
capture trimmed `outerHTML` + section/heading + role/aria.
**Decision:** Capture a trimmed `outerHTML` excerpt plus `section` (nearest
heading) and `role`/`aria-label`. Zero deps.
**Rationale:** For a *coding* agent, the actual markup + source `file:line` +
computed styles is more actionable than a raster it can't edit. Pixel capture
logged as a future option, not shipped. Keeps the package dependency-light.

## 2026-07-09 — v0.2: atomic store writes + smoke test as publish gate
**Context:** `annotations.json` was written with a plain `writeFileSync`; a
crash mid-write truncates it. No automated verification existed.
**Decision:** Write to `file.<pid>.tmp` then `renameSync` (atomic on same FS).
Add `test/smoke.mjs` (store + all MCP tools via InMemoryTransport + /health),
wired to `npm test` and `prepublishOnly`.
**Rationale:** The store is the single source of truth across agent+owner; it
must not corrupt. `prepublishOnly` blocks a broken publish.

## 2026-07-09 — Original implementation; Agentation as concept reference only
**Context:** Owner wants an Astro-native replica of agentation.com. Agentation
is licensed PolyForm Shield 1.0.0 (no competing use; source readable).
**Options:** Fork/port their code · clean-room original implementation.
**Decision:** Original implementation under MIT. Their npm tarballs
(agentation 3.0.2, agentation-mcp 1.2.0) were read as *concept* reference:
annotation data shape, MCP tool set (list/watch/ack/resolve/dismiss/reply),
detail-level markdown idea. Zero code copied; architecture differs (single
process inside Astro dev server vs their toolbar + separate CLI server).
**Rationale:** Interface shapes/APIs aren't copyrightable expression; code is.
Personal-use tool, but keep it clean anyway.

## 2026-07-09 — Single process over separate MCP CLI
**Context:** Agentation runs toolbar → HTTP :4747 → separate `agentation-mcp`
CLI (stdio MCP + sqlite in ~/.agentation).
**Decision:** Everything inside the Astro integration: toolbar ↔ dev server
via built-in toolbar server events (no CORS), store = JSON in project
`.astrotation/`, MCP = Streamable HTTP on :7133 hosted by the integration.
**Rationale:** One `npm i` + one config line; no daemon to forget to start;
fixed port → register MCP once for all projects (one dev server at a time).

## 2026-07-09 — Stateless MCP transport, fresh server per request
**Context:** Streamable HTTP MCP can be stateful (sessions) or stateless.
**Decision:** Stateless; new McpServer+transport per POST, shared store
singleton; `enableJsonResponse: true`.
**Rationale:** Claude Code reconnects across sessions freely; no session
bookkeeping; long-poll `watch` still works (request stays open, store is
shared). Concurrent request ID collisions avoided by per-request server.
