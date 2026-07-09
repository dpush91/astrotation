# Changelog

## 0.2.0 — 2026-07-09

Robustness, richer context, and publish readiness.

### Added
- **Keyboard element traversal** while annotating — `↑`/`↓` walk the hovered
  target up to its parent / down to its first child, so you can hit the exact
  element without pixel-hunting with the mouse.
- **Richer capture** per annotation: trimmed `outerHTML` excerpt, `section`
  (nearest heading context), and `role`/`aria-label`. Agents see the real
  markup and where it sits on the page, not just a selector.
- **`astrotation_get`** MCP tool — fetch one annotation with full detail
  (thread, source, styles, outerHTML) before editing the source.
- **`astrotation_clear`** MCP tool + overlay "clear done" button — bulk-remove
  resolved/dismissed annotations (housekeeping).
- **Smoke test** (`npm test`, also runs on `prepublishOnly`) — 22 assertions
  over the store, all MCP tools, and the HTTP endpoint.
- `LICENSE`, `CHANGELOG.md`, and `engines`/`repository` metadata for npm.

### Changed
- **Atomic store writes** — write to a temp file then rename, so a crash
  mid-write can't corrupt `annotations.json`. Write errors surface as a dev
  warning instead of throwing.
- Improved "Copy markdown" export — includes source `file:line`, status,
  section, and Tailwind classes.

## 0.1.0 — 2026-07-09

Initial release. Astro Dev Toolbar app + in-process MCP server (Streamable
HTTP, port 7133). Tools: `list`, `watch`, `acknowledge`, `resolve`,
`dismiss`, `reply`. Element→source mapping via Astro's
`data-astro-source-file`/`-loc` dev attributes.
