import { defineToolbarApp } from 'astro/toolbar';
import { BG_TEXTURE } from './bg.js';

// Warp chip palette + a distinct glyph per status so colour isn't the only
// signal (colour-blind safe): orange = open, blue = in progress, red ◆ = agent
// handed back for review, green = owner-approved, coral ✕ = dismissed.
// Shapes differ (○ ◑ ◆ ✓ ✕), readable without colour.
const STATUS = {
  pending:      { color: '#e0a15a', glyph: '○', label: 'open' },
  acknowledged: { color: '#5b9bf0', glyph: '◑', label: 'in progress' },
  feedback:     { color: '#ef4d5a', glyph: '◆', label: 'feedback' },
  resolved:     { color: '#6fb26a', glyph: '✓', label: 'resolved' },
  dismissed:    { color: '#e0685f', glyph: '✕', label: 'dismissed' },
};
const statusOf = (s) => STATUS[s] ?? STATUS.pending;

// Panel header affordances: 6-dot drag grip + collapse/expand chevron.
const GRIP_SVG = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/><circle cx="2" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="2" cy="14" r="1.3"/><circle cx="8" cy="14" r="1.3"/></svg>';
const CHEVRON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

// Warp aesthetic: cool near-black base with a faint star-dust texture, muted
// blue accent, generous radii, sans chrome + mono only for code (file:line /
// selector), block-style rows with hover.
const STYLE = `
  .atn-layer {
    --atn-bg: rgba(11, 11, 13, 0.93);
    --atn-surface: rgba(255, 255, 255, 0.04);
    --atn-surface-hover: rgba(255, 255, 255, 0.08);
    --atn-border: rgba(255, 255, 255, 0.08);
    --atn-text: #ececee;
    --atn-muted: #8a8c94;
    --atn-accent: #4d7fd6;
    --atn-accent-soft: rgba(77, 127, 214, 0.14);
    --atn-accent-ring: rgba(77, 127, 214, 0.28);
    --atn-code: #8ab4f8;
    --atn-claude: #d97757;
    --atn-radius: 12px;
    --atn-radius-sm: 0px;
    --atn-line: rgba(255, 255, 255, 1);
    --atn-mono: "Hack", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --atn-tex-img: url("${BG_TEXTURE}");
    --atn-tex: var(--atn-tex-img);
    position: fixed; inset: 0; pointer-events: none; z-index: 2147483000;
    font-family: "Hack", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    color: var(--atn-text);
  }
  .atn-hl { position: fixed; border: 1.5px solid var(--atn-accent); background: var(--atn-accent-soft); border-radius: var(--atn-radius-sm); display: none; transition: all .06s linear; }
  .atn-hl-label { position: absolute; top: -24px; left: -1.5px; background: var(--atn-bg); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid var(--atn-border); color: var(--atn-code); font-family: var(--atn-mono); font-size: 10px; line-height: 18px; padding: 1px 8px; border-radius: 12px; white-space: nowrap; max-width: 60vw; overflow: hidden; text-overflow: ellipsis; }
  .atn-pin { position: fixed; width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.14); transform: translate(-50%, -50%); transition: transform .1s ease; }
  .atn-pin:hover { transform: translate(-50%, -50%) scale(1.12); }
  .atn-popup, .atn-panel { pointer-events: auto; background-color: var(--atn-bg); background-image: var(--atn-tex); background-size: cover; background-position: center; color: var(--atn-text); border: 1px solid var(--atn-border); border-radius: var(--atn-radius); box-shadow: 0 16px 48px rgba(0,0,0,.55); font-size: 12.5px; }
  .atn-popup { position: fixed; width: 320px; padding: 14px; }
  .atn-src { color: var(--atn-muted); font-family: var(--atn-mono); font-size: 11px; margin-bottom: 8px; word-break: break-all; }
  .atn-src::before { content: "# "; }
  /* terminal command line: prompt glyph + input, framed edge-to-edge by white
     top+bottom lines, textured. Bleeds to the container edges via -margin. */
  .atn-cmd { display: flex; gap: 8px; align-items: flex-start; background-color: var(--atn-bg); background-image: var(--atn-tex); background-size: cover; background-position: center; border-top: 1px solid var(--atn-line); border-bottom: 1px solid var(--atn-line); padding: 9px 0; }
  .atn-popup .atn-cmd { margin: 0 -14px; padding: 9px 14px; }
  .atn-item .atn-cmd { margin: 8px -16px 0; padding: 9px 16px; }
  .atn-prompt { color: var(--atn-accent); font-weight: 700; flex: none; line-height: 1.5; user-select: none; }
  .atn-input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; resize: none; overflow: hidden; margin: 0; padding: 0; color: var(--atn-text); font: inherit; font-family: var(--atn-mono); line-height: 1.5; caret-color: var(--atn-accent); caret-shape: block; }
  .atn-input::placeholder { color: var(--atn-muted); }
  .atn-cmdhint { color: var(--atn-muted); font-size: 10.5px; margin: 8px 0 0 20px; }
  .atn-cmdhint b { color: var(--atn-text); font-weight: 600; }
  .atn-btn { background: none; color: var(--atn-muted); border: 0; padding: 2px 0; font: inherit; font-size: 11px; cursor: pointer; transition: color .12s ease; }
  .atn-btn:hover { color: var(--atn-text); }
  .atn-panel { position: fixed; right: 14px; bottom: 68px; width: 380px; max-height: 64vh; overflow-y: auto; padding: 14px 16px; }
  /* header row + edge-to-edge hairline under it, so it reads as the annotations header */
  .atn-head { display: flex; align-items: center; gap: 10px; margin: 0 -16px 12px; padding: 0 16px 12px; border-bottom: 1px solid var(--atn-border); }
  .atn-panel--collapsed { width: auto; overflow: visible; }
  .atn-panel--collapsed .atn-head { margin: 0; padding: 0; border-bottom: 0; }
  .atn-grip { flex: none; display: flex; align-items: center; color: var(--atn-muted); cursor: grab; padding: 2px; margin: -2px; touch-action: none; }
  .atn-grip:hover { color: var(--atn-text); }
  .atn-grip:active { cursor: grabbing; }
  .atn-grip svg { display: block; }
  .atn-headmid { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; white-space: nowrap; }
  .atn-title { font-size: 12px; font-weight: 500; letter-spacing: .3px; color: var(--atn-muted); }
  .atn-headmid .atn-clear { margin-left: auto; }
  .atn-stat { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--atn-text); font-variant-numeric: tabular-nums; }
  .atn-stat i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .atn-chev { flex: none; background: none; border: 0; color: var(--atn-muted); cursor: pointer; padding: 2px; margin: -2px; display: flex; transition: color .12s ease, transform .18s ease; }
  .atn-chev:hover { color: var(--atn-text); }
  .atn-chev.is-collapsed { transform: rotate(180deg); }
  .atn-clear { background: none; border: 0; color: var(--atn-muted); font: inherit; font-size: 11px; cursor: pointer; padding: 0; transition: color .12s ease; }
  .atn-clear:hover { color: var(--atn-text); }
  /* annotation = terminal log block: glyph gutter + text, hairline divider between */
  .atn-item { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--atn-border); }
  .atn-item:last-of-type { border-bottom: 0; padding-bottom: 0; margin-bottom: 6px; }
  .atn-item.atn-focus { box-shadow: inset 3px 0 0 var(--atn-accent); padding-left: 8px; margin-left: -8px; }
  .atn-item .atn-meta { display: flex; align-items: baseline; gap: 8px; }
  .atn-dot { font-size: 12px; line-height: 1.4; font-weight: 700; flex: none; width: 12px; text-align: center; }
  .atn-item .atn-el { color: var(--atn-code); font-family: var(--atn-mono); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  .atn-status { font-size: 10px; font-weight: 500; letter-spacing: .2px; flex: none; text-transform: lowercase; }
  .atn-item .atn-comment { margin: 3px 0 0; padding-left: 20px; line-height: 1.5; }
  .atn-thread { margin: 6px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 3px; }
  .atn-msg { font-size: 11.5px; line-height: 1.5; color: var(--atn-muted); }
  .atn-msg .atn-who-me { color: var(--atn-text); }
  .atn-msg .atn-who-agent { color: var(--atn-claude); }
  .atn-msg .atn-pfx { color: var(--atn-muted); margin-right: 6px; }
  .atn-item .atn-actions { display: flex; gap: 14px; margin: 7px 0 0; padding-left: 20px; }
  .atn-item .atn-actions button { background: none; border: 0; color: var(--atn-muted); font: inherit; font-size: 11px; cursor: pointer; padding: 0; transition: color .12s ease; }
  .atn-item .atn-actions button:hover { color: var(--atn-text); }
  .atn-item .atn-actions .atn-resolve { margin-left: auto; }
  .atn-item .atn-actions .atn-resolve:not(.is-resolved):hover { color: #6fb26a; }
  .atn-foot { display: flex; justify-content: flex-end; margin: 10px -16px 0; padding: 10px 16px 0; border-top: 1px solid var(--atn-border); }
  .atn-empty { color: var(--atn-muted); padding: 4px 0 4px 20px; }
  .atn-hint { position: fixed; left: 50%; top: 14px; transform: translateX(-50%); background: var(--atn-bg); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border: 1px solid var(--atn-border); color: var(--atn-muted); padding: 5px 14px; border-radius: 999px; font-size: 11px; box-shadow: 0 8px 24px rgba(0,0,0,.4); pointer-events: none; }
`;

const CAPTURED_STYLES = [
  'display', 'position', 'width', 'height', 'padding', 'margin', 'gap',
  'font-size', 'line-height', 'font-weight', 'letter-spacing', 'text-transform',
  'color', 'background-color', 'border-radius',
];

function cssSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node.tagName !== 'BODY' && parts.length < 4) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const cls = [...node.classList].slice(0, 2).map((c) => `.${CSS.escape(c)}`).join('');
    part += cls;
    const parent = node.parentElement;
    if (parent) {
      const same = [...parent.children].filter((s) => s.tagName === node.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(' > ');
}

/**
 * The dev toolbar strips data-astro-source-* from the live DOM on load, so
 * we re-fetch the page HTML (attrs intact there) and resolve the selector.
 */
async function resolveSource(selector) {
  try {
    const html = await fetch(location.pathname, { headers: { accept: 'text/html' } }).then((r) => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const src = doc.querySelector(selector)?.closest('[data-astro-source-file]');
    if (!src) return {};
    const abs = src.getAttribute('data-astro-source-file');
    return {
      sourceFile: abs.includes('/src/') ? `src/${abs.split('/src/').pop()}` : abs,
      sourceLoc: src.getAttribute('data-astro-source-loc'),
    };
  } catch {
    return {};
  }
}

const fileLoc = (sourceFile, sourceLoc) => `${sourceFile}${sourceLoc ? `:${sourceLoc}` : ''}`;

/** Trimmed outerHTML so the agent sees real markup without dumping the subtree. */
function outerHtmlExcerpt(el, max = 600) {
  const raw = el.outerHTML ?? '';
  // Clip before the regex so a huge subtree isn't whitespace-collapsed in full.
  const clipped = raw.length > max * 3 ? raw.slice(0, max * 3) : raw;
  const html = clipped.replace(/\s+/g, ' ').trim();
  return html.length > max ? `${html.slice(0, max)}…` : html;
}

/** Section/heading the element lives under — orients the agent on the page. */
function headingContext(el) {
  const scope = el.closest('section, article, main, header, footer, aside') ?? document.body;
  const h = scope.querySelector('h1, h2, h3, h4, h5, h6');
  return h ? (h.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80) : null;
}

function captureElement(el) {
  const src = el.closest('[data-astro-source-file]');
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const sel = window.getSelection();
  const role = el.getAttribute('role');
  const ariaLabel = el.getAttribute('aria-label');
  return {
    page: location.pathname,
    url: location.href,
    viewport: `${innerWidth}x${innerHeight}`,
    element: el.tagName.toLowerCase(),
    selector: cssSelector(el),
    sourceFile: src?.getAttribute('data-astro-source-file') ?? null,
    sourceLoc: src?.getAttribute('data-astro-source-loc') ?? null,
    classes: el.getAttribute('class') ?? '',
    role: role || (ariaLabel ? `[aria-label="${ariaLabel}"]` : null),
    section: headingContext(el),
    styles: CAPTURED_STYLES.map((p) => `${p}: ${cs.getPropertyValue(p)}`).join('; '),
    text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
    selectedText: sel && !sel.isCollapsed ? sel.toString().slice(0, 300) : null,
    outerHTML: outerHtmlExcerpt(el),
    box: {
      x: Math.round(rect.left + scrollX),
      y: Math.round(rect.top + scrollY),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
  };
}

function annotationsToMarkdown(list) {
  let out = `## Page feedback: ${location.pathname}\n\n`;
  list.forEach((a, i) => {
    const loc = a.sourceFile ? fileLoc(a.sourceFile, a.sourceLoc) : a.selector;
    out += `${i + 1}. **${a.element}** — \`${loc}\``;
    if (a.status && a.status !== 'pending') out += ` _(${a.status})_`;
    out += `\n   ${a.comment}\n`;
    if (a.section) out += `   · under "${a.section}"\n`;
    if (a.classes) out += `   · classes: \`${a.classes}\`\n`;
    if (a.selectedText) out += `   · re: "${a.selectedText.slice(0, 60)}"\n`;
  });
  return out;
}

/**
 * Terminal-style command line: an accent ❯ prompt + a borderless auto-growing
 * input with a block caret. Enter submits, Shift+Enter newline, Esc cancels.
 */
function cmdLine(placeholder, initial, onSubmit, onCancel) {
  const wrap = document.createElement('div');
  wrap.className = 'atn-cmd';
  const prompt = document.createElement('span');
  prompt.className = 'atn-prompt';
  prompt.textContent = '❯';
  const ta = document.createElement('textarea');
  ta.className = 'atn-input';
  ta.rows = 1;
  ta.placeholder = placeholder;
  ta.value = initial ?? '';
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const v = ta.value.trim();
      if (v) onSubmit(v);
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
    e.stopPropagation();
  });
  wrap.append(prompt, ta);
  requestAnimationFrame(grow);
  return { wrap, ta };
}

export default defineToolbarApp({
  init(canvas, app, server) {
    let active = false;
    let annotations = [];
    let openPopup = null;
    let hoverEl = null;
    let panelSig = null;                 // skip panel rebuilds when data is unchanged
    let replyDraft = null;               // { id, text } — survives rebuilds so typing isn't lost
    let panelCollapsed = false;          // collapsed = compact bar (grip · status dots · chevron)
    let panelPos = null;                 // { left, top } once dragged; else CSS bottom-right anchor

    const style = document.createElement('style');
    style.textContent = STYLE;
    canvas.appendChild(style);

    const layer = document.createElement('div');
    layer.className = 'atn-layer';
    canvas.appendChild(layer);

    const hl = document.createElement('div');
    hl.className = 'atn-hl';
    hl.innerHTML = '<span class="atn-hl-label"></span>';
    layer.appendChild(hl);

    const pinsWrap = document.createElement('div');
    layer.appendChild(pinsWrap);

    const panel = document.createElement('div');
    panel.className = 'atn-panel';
    panel.style.display = 'none';
    layer.appendChild(panel);

    const hint = document.createElement('div');
    hint.className = 'atn-hint';
    hint.textContent = 'Click to annotate · ↑↓ select parent/child · Esc to close';
    hint.style.display = 'none';
    layer.appendChild(hint);

    const isOurs = (e) => e.composedPath().includes(layer);

    /* ---------- pins ---------- */
    function renderPins() {
      pinsWrap.textContent = '';
      annotations
        .filter((a) => a.page === location.pathname)
        .forEach((a, i) => {
          const s = statusOf(a.status);
          const pin = document.createElement('div');
          pin.className = 'atn-pin';
          pin.textContent = s.glyph;
          pin.style.background = s.color;
          pin.style.left = `${a.box.x + a.box.w / 2 - scrollX}px`;
          pin.style.top = `${a.box.y - scrollY}px`;
          pin.title = `#${i + 1} · ${s.label} — ${a.comment}`;
          pin.onclick = () => renderPanel(a.id);
          pinsWrap.appendChild(pin);
        });
    }
    // Scroll/resize fire in bursts; collapse to one reposition per frame.
    let pinFrame = 0;
    const repositionPins = () => {
      if (!active || pinFrame) return;
      pinFrame = requestAnimationFrame(() => {
        pinFrame = 0;
        renderPins();
      });
    };
    addEventListener('scroll', repositionPins, { passive: true });
    addEventListener('resize', repositionPins, { passive: true });

    /* ---------- panel ---------- */
    function openReply(item, a) {
      if (item.querySelector('.atn-cmd')) return;
      const initial = replyDraft?.id === a.id ? replyDraft.text : '';
      replyDraft = { id: a.id, text: initial };
      const { wrap, ta } = cmdLine(
        'reply…',
        initial,
        (val) => {
          server.send('astrotation:owner-reply', { id: a.id, message: val });
          replyDraft = null;
          wrap.remove();
        },
        () => { replyDraft = null; wrap.remove(); }
      );
      ta.addEventListener('input', () => { replyDraft = { id: a.id, text: ta.value }; });
      item.appendChild(wrap);
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }

    // Reposition the panel after a drag (switches anchor from CSS bottom-right to left/top).
    function applyPanelPos() {
      if (!panelPos) return;
      panel.style.left = `${panelPos.left}px`;
      panel.style.top = `${panelPos.top}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
    // Grab the grip → drag the whole panel; clamped to the viewport.
    function startDrag(e) {
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      const move = (ev) => {
        panelPos = {
          left: Math.max(0, Math.min(ev.clientX - offX, innerWidth - panel.offsetWidth)),
          top: Math.max(0, Math.min(ev.clientY - offY, innerHeight - panel.offsetHeight)),
        };
        applyPanelPos();
      };
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
    }

    function renderPanel(focusId) {
      panel.style.display = active ? 'block' : 'none';
      panel.className = 'atn-panel' + (panelCollapsed ? ' atn-panel--collapsed' : '');
      panel.textContent = '';
      panelSig = JSON.stringify(annotations);

      // Header: [grip] · (title + clear-done | status dots) · [chevron]
      const head = document.createElement('div');
      head.className = 'atn-head';
      const grip = document.createElement('div');
      grip.className = 'atn-grip';
      grip.title = 'drag to move';
      grip.innerHTML = GRIP_SVG;
      grip.addEventListener('pointerdown', startDrag);

      const mid = document.createElement('div');
      mid.className = 'atn-headmid';
      if (panelCollapsed) {
        const counts = {};
        annotations.forEach((a) => { const s = a.status || 'pending'; counts[s] = (counts[s] || 0) + 1; });
        ['pending', 'acknowledged', 'feedback', 'resolved', 'dismissed'].forEach((k) => {
          if (!counts[k]) return;
          const chip = document.createElement('span');
          chip.className = 'atn-stat';
          chip.title = STATUS[k].label;
          const dot = document.createElement('i');
          dot.style.background = STATUS[k].color;
          chip.append(dot, document.createTextNode(String(counts[k])));
          mid.appendChild(chip);
        });
      } else {
        const title = document.createElement('span');
        title.className = 'atn-title';
        title.textContent = `annotations (${annotations.length})`;
        mid.appendChild(title);
        const done = annotations.filter((a) => a.status === 'resolved' || a.status === 'dismissed').length;
        if (done) {
          const clear = document.createElement('button');
          clear.className = 'atn-clear';
          clear.textContent = `clear done (${done})`;
          clear.onclick = () => server.send('astrotation:clear', {});
          mid.appendChild(clear);
        }
      }

      const chev = document.createElement('button');
      chev.className = panelCollapsed ? 'atn-chev is-collapsed' : 'atn-chev';
      chev.title = panelCollapsed ? 'expand' : 'collapse';
      chev.innerHTML = CHEVRON_SVG;
      chev.onclick = () => { panelCollapsed = !panelCollapsed; renderPanel(focusId); };

      head.append(grip, mid, chev);
      panel.appendChild(head);

      if (panelCollapsed) { applyPanelPos(); return; }

      if (!annotations.length) {
        const empty = document.createElement('div');
        empty.className = 'atn-empty';
        empty.textContent = 'Click any element to leave a note';
        panel.appendChild(empty);
      }

      annotations.forEach((a) => {
        const item = document.createElement('div');
        item.className = 'atn-item';
        if (a.id === focusId) item.classList.add('atn-focus');

        const s = statusOf(a.status);
        const meta = document.createElement('div');
        meta.className = 'atn-meta';
        const dot = document.createElement('span');
        dot.className = 'atn-dot';
        dot.textContent = s.glyph;
        dot.style.color = s.color;
        const el = document.createElement('span');
        el.className = 'atn-el';
        el.textContent = a.sourceFile
          ? `${a.sourceFile.split('/').pop()}${a.sourceLoc ? `:${a.sourceLoc}` : ''}`
          : a.selector;
        const label = document.createElement('span');
        label.className = 'atn-status';
        label.textContent = s.label;
        label.style.color = s.color;
        meta.append(dot, el, label);
        item.appendChild(meta);

        const c = document.createElement('div');
        c.className = 'atn-comment';
        c.textContent = a.comment;
        item.appendChild(c);

        if (a.thread?.length) {
          const th = document.createElement('div');
          th.className = 'atn-thread';
          a.thread.forEach((m) => {
            const msg = document.createElement('div');
            msg.className = 'atn-msg';
            const pfx = document.createElement('span');
            pfx.className = 'atn-pfx';
            pfx.textContent = '❯';
            const who = document.createElement('span');
            who.className = m.from === 'agent' ? 'atn-who-agent' : 'atn-who-me';
            who.textContent = `${m.from === 'agent' ? 'agent' : 'me'}: `;
            msg.append(pfx, who, document.createTextNode(m.message));
            th.appendChild(msg);
          });
          item.appendChild(th);
        }

        const actions = document.createElement('div');
        actions.className = 'atn-actions';
        const replyBtn = document.createElement('button');
        replyBtn.textContent = 'reply';
        replyBtn.onclick = () => openReply(item, a);
        const delBtn = document.createElement('button');
        delBtn.textContent = 'delete';
        delBtn.onclick = () => server.send('astrotation:delete', { id: a.id });
        const resolved = a.status === 'resolved';
        const resBtn = document.createElement('button');
        resBtn.className = resolved ? 'atn-resolve is-resolved' : 'atn-resolve';
        resBtn.textContent = resolved ? 'unresolve' : 'resolve';
        resBtn.title = resolved ? 'reopen (undo resolve)' : 'mark resolved';
        resBtn.onclick = () =>
          server.send('astrotation:set-status', { id: a.id, status: resolved ? 'acknowledged' : 'resolved' });
        actions.append(replyBtn, delBtn, resBtn);
        item.appendChild(actions);

        // Re-open the reply box across rebuilds so an in-flight draft isn't lost.
        if (replyDraft?.id === a.id) openReply(item, a);

        panel.appendChild(item);
      });

      if (annotations.length) {
        const foot = document.createElement('div');
        foot.className = 'atn-foot';
        const copy = document.createElement('button');
        copy.className = 'atn-btn';
        copy.textContent = 'copy markdown';
        copy.onclick = () => navigator.clipboard.writeText(annotationsToMarkdown(annotations));
        foot.appendChild(copy);
        panel.appendChild(foot);
      }

      applyPanelPos();
    }

    /* ---------- annotate flow ---------- */
    function showPopup(target, capture, clickX, clickY) {
      closePopup();
      const popup = document.createElement('div');
      popup.className = 'atn-popup';
      popup.style.left = `${Math.min(clickX, innerWidth - 320)}px`;
      popup.style.top = `${Math.min(clickY + 8, innerHeight - 180)}px`;

      const src = document.createElement('div');
      src.className = 'atn-src';
      src.textContent = capture.sourceFile ? fileLoc(capture.sourceFile, capture.sourceLoc) : capture.selector;
      popup.appendChild(src);
      if (!capture.sourceFile) {
        resolveSource(capture.selector).then((res) => {
          if (res.sourceFile) {
            Object.assign(capture, res);
            src.textContent = fileLoc(res.sourceFile, res.sourceLoc);
          }
        });
      }

      const { wrap, ta } = cmdLine(
        'what should change here…',
        '',
        (val) => {
          server.send('astrotation:add', { ...capture, comment: val });
          closePopup();
        },
        closePopup
      );
      popup.appendChild(wrap);

      const cmdHint = document.createElement('div');
      cmdHint.className = 'atn-cmdhint';
      cmdHint.innerHTML = '<b>⏎</b> save   <b>esc</b> cancel';
      popup.appendChild(cmdHint);

      layer.appendChild(popup);
      openPopup = popup;
      ta.focus();
    }

    function closePopup() {
      openPopup?.remove();
      openPopup = null;
    }

    function highlight(el) {
      if (!el || el === document.body || el === document.documentElement) {
        hoverEl = null;
        hl.style.display = 'none';
        return;
      }
      hoverEl = el;
      const rect = el.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.left = `${rect.left}px`;
      hl.style.top = `${rect.top}px`;
      hl.style.width = `${rect.width}px`;
      hl.style.height = `${rect.height}px`;
      const src = el.closest('[data-astro-source-file]');
      const label = hl.querySelector('.atn-hl-label');
      label.textContent = src
        ? `${src.getAttribute('data-astro-source-file').split('/').slice(-2).join('/')} — ${cssSelector(el)}`
        : cssSelector(el);
    }

    const onMove = (e) => {
      if (!active || openPopup || isOurs(e)) {
        hl.style.display = 'none';
        return;
      }
      highlight(e.target);
    };

    const onClick = (e) => {
      if (!active || isOurs(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (openPopup) {
        closePopup();
        return;
      }
      const el = hoverEl ?? e.target;
      showPopup(el, captureElement(el), e.clientX, e.clientY);
    };

    const onKey = (e) => {
      if (!active) return;
      if (e.key === 'Escape') {
        if (openPopup) closePopup();
        else app.toggleState({ state: false });
        return;
      }
      // Refine the hovered target up/down the DOM tree without moving the mouse.
      if (!openPopup && hoverEl && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const next = e.key === 'ArrowUp' ? hoverEl.parentElement : hoverEl.firstElementChild;
        if (next && next !== document.body && next !== document.documentElement) {
          e.preventDefault();
          highlight(next);
        }
      }
    };

    addEventListener('mousemove', onMove, true);
    addEventListener('click', onClick, true);
    addEventListener('keydown', onKey, true);

    /* ---------- server sync ---------- */
    server.on('astrotation:state', (data) => {
      const prevAgentMsgs = annotations.reduce(
        (n, a) => n + (a.thread?.filter((m) => m.from === 'agent').length ?? 0), 0);
      annotations = data.annotations ?? [];
      const agentMsgs = annotations.reduce(
        (n, a) => n + (a.thread?.filter((m) => m.from === 'agent').length ?? 0), 0);
      if (agentMsgs > prevAgentMsgs && !active) app.toggleNotification({ state: true });
      renderPins();
      // Rebuild the panel only when the data actually changed (the initial
      // double-sync and unrelated pushes would otherwise wipe an open reply).
      if (JSON.stringify(annotations) !== panelSig) renderPanel();
    });

    app.onToggled(({ state }) => {
      active = state;
      hint.style.display = state ? 'block' : 'none';
      panel.style.display = state ? 'block' : 'none';
      pinsWrap.style.display = state ? 'block' : 'none';
      hl.style.display = 'none';
      if (state) {
        app.toggleNotification({ state: false });
        server.send('astrotation:sync', {});
        renderPins();
        renderPanel();
      } else {
        closePopup();
      }
    });

    pinsWrap.style.display = 'none';
    server.send('astrotation:sync', {});
  },
});
