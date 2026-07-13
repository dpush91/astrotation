# Changelog

## 0.5.1 — 2026-07-13

### Fixed
- **`astrotation_watch` no longer loses annotations created while the agent
  was busy.** watch() was purely event-based: `new`/`owner-reply` events that
  fired while no watch call was active (the agent mid-fix on another item)
  went nowhere, so those annotations sat "open" forever and the watch loop
  idled past them. watch() is now scan-based: on entry (and on every store
  change) it scans for deliverable work and returns backlog immediately —
  pending annotations the agent hasn't picked up, plus acknowledged/feedback
  threads where the owner spoke last. An unanswered agent question parks its
  item until the owner replies (no re-deliver loops; feedback/dismiss already
  push an agent thread entry, so handed-back items stay parked too).
- Watch now rides the `change` event, which also fires on external file
  writes — a second process feeding the same store file wakes the watch.

## 0.5.0 — 2026-07-10

### Changed
- **New review flow: the agent no longer resolves.** `astrotation_resolve` is
  replaced by `astrotation_feedback` — the agent's terminal action after a fix
  turns the pin RED (◆ `feedback` = "done, review me"). The owner reviews in
  the overlay and either resolves it green (new client-side status button, via
  the `astrotation:set-status` toolbar event) or replies with more notes to
  iterate. `resolved`/`dismissed` are owner-side now.
- New `feedback` status everywhere: store JSDoc, `astrotation_list`/
  `astrotation_clear` enums, watch-loop description (watch → ack → fix →
  feedback), panel glyph ◆ (red #ef4d5a, colorblind-safe), notification badge
  wakes on agent feedback posts.
- Edge-to-edge divider under the panel header (expanded state only).
- Background texture confirmed as the owner's own artwork — ships as-is,
  MIT-clean (supersedes the 0.4.2 note about swapping it before publish).

## 0.4.5 — 2026-07-09

### Changed
- Background shows the **original texture at full strength** — dropped the 90%
  scrim so the grunge is clearly visible (was too faint at ~10%). The texture's
  own dark vignette keeps the edges readable.

## 0.4.4 — 2026-07-09

### Changed
- Selective rounding: panel, popup and the hovered-element label are 12px
  rounded again; the top "click to annotate" hint is a full pill; pins are
  round again. The blue element-selection box stays sharp (rectangular).
- The input field's frame lines are now full-width (edge-to-edge, bleeding to
  the container edge) and 100% white — in both the popup and inline replies.
  Item dividers stay subtle so only the input reads as bold white lines.

## 0.4.3 — 2026-07-09

### Changed
- **Sharp corners everywhere** — radius tokens set to 0; pins, panel, popup,
  hint and labels are now square (terminal-rectangular).
- **Texture dialed to ~10%** — regenerated from the original (no +50% bake),
  shown through a 90% scrim, so it's a faint grain instead of a dark wash.
- **Input field is now a framed, textured command field** — the `❯` prompt +
  input sit on the texture, bracketed by top and bottom hairlines (Warp-style),
  in both the annotate popup and inline replies. Behaviour unchanged.

## 0.4.2 — 2026-07-09

### Changed
- **Background is now the owner-supplied grunge texture** (darkened +50% black,
  resized, webp, baked as a data-uri in `src/bg.js`) instead of the generated
  splatter + star-dust, which were removed. Panels/popup drop the backdrop
  blur (the texture is opaque). Verified via an offscreen render of the real
  STYLE before shipping.
  NOTE: the texture is embedded for local dogfood use; swap it for an
  own/CC0 asset before any npm publish (MIT package shouldn't redistribute it).

## 0.4.1 — 2026-07-09

### Added
- **Splatter background** in the spirit of Warp's "Phenomenon" theme — an
  original layered ink-blob glow (muted teal/indigo/magenta at low alpha)
  under the star-dust. Recreated, not copied: Warp's bundled art isn't
  redistributed in this MIT package.
- **Hairline dividers** between annotations in the panel list.

## 0.4.0 — 2026-07-09

### Changed
- **Terminal-native overlay — no more cards.** Reworked the overlay to read as
  a continuation of the terminal instead of a stack of AI-style cards:
  - Input is a terminal command line — an accent `❯` prompt + a borderless
    auto-growing field with a block caret. Enter submits, Shift+Enter newline,
    Esc cancels. No boxed textarea, no Save/Cancel buttons (a dim
    `⏎ save · esc cancel` hint instead).
  - Annotations render as terminal log blocks: a status glyph gutter + file:line
    + comment, separated by whitespace — no borders, no card backgrounds, no
    hover boxes. Thread replies show as `❯ agent:` / `❯ me:` lines.
  - Panel/popup keep the Warp window chrome (near-black glass + star-dust);
    everything inside is monospace terminal output. Focused item gets a left
    accent rule, not a border.

## 0.3.2 — 2026-07-09

### Changed
- **Status colours + colour-blind-safe glyphs.** Warp chip palette: open =
  orange `○`, in progress = blue `◑`, resolved = green `✓`,
  dismissed = red `✕`. Every status now carries a distinct glyph (shape) and a
  text label in the panel, so status is readable without relying on colour.
  Pins show the glyph (not a number); the number moves to the pin tooltip.

## 0.3.1 — 2026-07-09

### Fixed
- Reply **Send** button was an unstyled default (white) button — now the
  Warp-blue pill (`.atn-btn`), right-aligned in its own row like the popup
  Save. Found in dogfooding against a real Warp screenshot.

## 0.3.0 — 2026-07-09

### Changed
- **Warp-inspired overlay redesign.** Cool near-black glass surfaces (blur +
  saturate) with a faint CSS star-dust texture, muted Warp-blue accent,
  generous radii (16px panels / 10px elements), Hack mono throughout, and
  block-style annotation rows with hover. Pins get a soft ring + hover scale;
  buttons are pill-shaped; textareas have a focus ring. Pure CSS — no external
  assets, no JS/logic changes, all class names unchanged. Requires a dev
  server restart to reload the toolbar app.

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
