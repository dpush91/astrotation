# Changelog

## 0.2.2 — 2026-07-09

### Fixed
- **Stale store / empty MCP list.** The store loaded its file once at startup
  and never re-read it, so if a second dev server held the MCP port (or the
  file was edited out of band), `astrotation_list` returned data from the
  wrong/empty in-memory copy. The store now watches the file (`fs.watchFile`)
  and reloads on external writes. The shared file also acts as a cross-process
  sync bus — resolving via the MCP process turns the pin green in an overlay
  served by another process. Watcher is `unref`'d and closed on
  `astro:server:done`. Found by dogfooding with two dev servers running.

## 0.2.1 — 2026-07-09

Overlay refactor + performance. No behavior or API change.

### Fixed
- Typing a reply is no longer lost when a background state push arrives
  (agent acks/resolves another annotation mid-typing) — the draft is tracked
  and re-opened across panel rebuilds.

### Performance
- Panel rebuilds only when annotation data actually changed (signature guard),
  instead of on every state push — including the initial double-sync.
- Pin repositioning on scroll/resize is throttled to one `requestAnimationFrame`
  per frame instead of running on every event.
- `outerHTML` is clipped before whitespace-collapsing, so a huge subtree isn't
  regex-processed in full.

### Internal
- Extracted `openReply()` and a `fileLoc()` helper; removed duplicated
  `file:line` string-building.

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
