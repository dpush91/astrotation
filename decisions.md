# Decision Log

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
