# Astrotation

Visual feedback for AI coding agents on **Astro** sites. Annotate elements
right on your dev page; agents (Claude Code etc.) receive annotations live
over MCP — with the exact Astro source `file:line`, CSS selector, Tailwind
classes and computed styles attached.

Dev-only. Nothing ships to production builds.

## Why Astro-native

- **`file:line` precision.** Astro dev stamps elements with
  `data-astro-source-file`/`data-astro-source-loc` — annotations point at the
  component source line, no selector guessing.
- **One process.** The Astro integration hosts both the toolbar UI (Dev
  Toolbar app) and the MCP server inside the dev server. No separate CLI, no
  CORS, no extra ports to babysit.
- **Live both ways.** Agent resolves an annotation → the pin turns green in
  your overlay. Agent asks a question → you reply in the overlay.

## Install

```bash
npm install -D astrotation
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import astrotation from 'astrotation';

export default defineConfig({
  integrations: [astrotation()],
});
```

Register the MCP server once (any project, same port):

```bash
claude mcp add --transport http astrotation http://localhost:7133/mcp
```

## Use

1. `npm run dev`, open the site, click the ⊕ Astrotation icon in the Astro
   dev toolbar.
2. Click any element → write a note → Save (⌘Enter). Pin appears.
3. Tell your agent «глянь анотації» — or put it in hands-free mode:
   *"call astrotation_watch in a loop; for each annotation: acknowledge, fix,
   resolve with a summary"*.
4. Pins recolor live: 🟡 pending → 🔵 acknowledged → 🟢 resolved / ⚪ dismissed.
   Agent questions show in the annotation thread; reply inline.

## MCP tools

| Tool | Purpose |
|---|---|
| `astrotation_list` | All annotations (filter by `status`, `page`) |
| `astrotation_watch` | Block until new annotations/replies, return batch |
| `astrotation_acknowledge` | Mark as being worked on |
| `astrotation_resolve` | Mark fixed, with summary shown to the owner |
| `astrotation_dismiss` | Decline with a reason |
| `astrotation_reply` | Ask the owner a clarifying question |

## Options

```js
astrotation({
  port: 7133,                            // MCP HTTP port
  file: '.astrotation/annotations.json', // store, relative to project root
})
```

Add `.astrotation/` to your `.gitignore` (session artifacts, not source).

## Annotation payload

```jsonc
{
  "id": "a1b2c3d4",
  "page": "/", "url": "http://localhost:4321/", "viewport": "1440x900",
  "element": "p",
  "selector": "section#hero > div > p",
  "sourceFile": "src/components/Hero.astro", "sourceLoc": "49:8",
  "classes": "max-w-xs",
  "styles": "display: block; font-size: 14px; …",
  "text": "Senior product designer across…",
  "selectedText": null,
  "box": { "x": 980, "y": 620, "w": 320, "h": 120 },
  "comment": "make this column wider",
  "status": "pending",
  "thread": []
}
```

## License

MIT © Dmytro Karpushyn

Concept inspired by [Agentation](https://agentation.com) (Benji Taylor) —
independent implementation, no code shared.
