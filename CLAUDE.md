# CLAUDE.md — astrotation

## What this is

Astro integration: visual feedback tool for AI coding agents (Agentation
replica, Astro-native). Owner annotates elements in the Astro Dev Toolbar
overlay → annotations land in an in-process store → agents consume them
live over MCP (Streamable HTTP, port 7133).

## Architecture (single process, dev-only)

```
browser: toolbar.js (Dev Toolbar app, ShadowRoot UI)
   ↕ Astro toolbar server events (astrotation:* messages, built-in WS)
dev server: index.js (integration) + store.js (JSON file + EventEmitter)
   ↕ mcp.js — Streamable HTTP MCP on 127.0.0.1:7133/mcp (stateless,
     fresh McpServer per request; store is the shared singleton)
Claude Code: astrotation_list / get / watch / acknowledge / feedback /
             dismiss / reply / clear
```

- `src/index.js` — integration; hooks: config:setup (addDevToolbarApp),
  server:setup (store + toolbar bridge + MCP), server:done (close).
- `src/store.js` — AnnotationStore: CRUD, thread replies, `clear()`,
  atomic save (tmp+rename), `watch()` long-poll (batches events for 1.5s).
- `src/mcp.js` — MCP tools + HTTP endpoint; `/health` for checks.
  `buildServer(store)` exported for the smoke test.
- `src/toolbar.js` — overlay: hover highlight with source label, ↑/↓ DOM
  traversal, click → note popup, pins (status-colored), panel (threads,
  replies, delete, clear-done, copy-markdown fallback).
- `test/smoke.mjs` — `npm test`; store + all MCP tools (InMemoryTransport) +
  /health. Runs on `prepublishOnly`.

## Key facts

- Plain JS, no build step; `exports` points straight at `src/`.
- Deps: @modelcontextprotocol/sdk + zod. Peer: astro >= 4.7 (toolbar API).
- Element→source mapping = Astro's own `data-astro-source-file`/`-loc`
  dev attributes. The dev toolbar strips them from the *live* DOM on load,
  so on annotate we re-fetch the page HTML (attrs intact there) and resolve
  the selector via DOMParser. Paths trimmed to `src/…`.
- Capture also includes trimmed `outerHTML`, `section` (nearest heading),
  `role`/`aria-label` — richer context for the agent than a selector alone.
- Store file: `<project>/.astrotation/annotations.json` (host projects
  should gitignore it).
- Statuses: pending → acknowledged → feedback (agent done, awaiting owner
  review) → resolved | dismissed. Agent terminal action = `astrotation_feedback`
  (pin turns red ◆); resolve/dismiss are owner-side (overlay set-status button).
  Owner replies wake `astrotation_watch`.
- License: MIT, ours. Agentation (PolyForm Shield) used as concept
  reference ONLY — no code copied. See decisions.md.

## Dogfood

Wired into `pets/personal-site/site` (file: dep). MCP registered as
`astrotation` → http://localhost:7133/mcp.
