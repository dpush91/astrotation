import { defineToolbarApp } from 'astro/toolbar';

// Warp chip palette + a distinct glyph per status so colour isn't the only
// signal (colour-blind safe): orange = open, blue = in progress, green = done,
// red = closed/error. Shapes differ (○ ◑ ✓ ✕), readable without colour.
const STATUS = {
  pending:      { color: '#e0a15a', glyph: '○', label: 'open' },
  acknowledged: { color: '#5b9bf0', glyph: '◑', label: 'in progress' },
  resolved:     { color: '#6fb26a', glyph: '✓', label: 'resolved' },
  dismissed:    { color: '#e0685f', glyph: '✕', label: 'dismissed' },
};
const statusOf = (s) => STATUS[s] ?? STATUS.pending;

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
    --atn-radius: 16px;
    --atn-radius-sm: 10px;
    --atn-mono: "Hack", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    /* Warp star-dust: sparse faint specks, tiled so panels of any size fill */
    --atn-stars:
      radial-gradient(1.1px 1.1px at 14% 22%, rgba(255,255,255,.11), transparent 60%),
      radial-gradient(1px 1px at 38% 64%, rgba(255,255,255,.08), transparent 60%),
      radial-gradient(1px 1px at 61% 31%, rgba(255,255,255,.07), transparent 60%),
      radial-gradient(1.3px 1.3px at 82% 76%, rgba(255,255,255,.09), transparent 60%),
      radial-gradient(1px 1px at 90% 46%, rgba(255,255,255,.06), transparent 60%),
      radial-gradient(1px 1px at 27% 89%, rgba(255,255,255,.06), transparent 60%),
      radial-gradient(1px 1px at 52% 92%, rgba(255,255,255,.05), transparent 60%);
    /* Splatter glow in the spirit of Warp's "Phenomenon" — original ink blobs,
       muted teal/indigo/magenta at low alpha so text stays readable */
    --atn-splatter:
      radial-gradient(150px 110px at 16% 10%, rgba(64,150,170,.13), transparent 70%),
      radial-gradient(190px 150px at 90% 86%, rgba(158,74,150,.11), transparent 72%),
      radial-gradient(110px 90px at 72% 22%, rgba(84,102,214,.10), transparent 70%),
      radial-gradient(60px 60px at 40% 64%, rgba(90,172,182,.10), transparent 68%),
      radial-gradient(34px 34px at 60% 78%, rgba(168,92,162,.10), transparent 66%),
      radial-gradient(20px 20px at 30% 44%, rgba(96,168,200,.12), transparent 60%);
    position: fixed; inset: 0; pointer-events: none; z-index: 2147483000;
    font-family: "Hack", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    color: var(--atn-text);
  }
  .atn-hl { position: fixed; border: 1.5px solid var(--atn-accent); background: var(--atn-accent-soft); border-radius: var(--atn-radius-sm); display: none; transition: all .06s linear; }
  .atn-hl-label { position: absolute; top: -24px; left: -1.5px; background: var(--atn-bg); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid var(--atn-border); color: var(--atn-code); font-family: var(--atn-mono); font-size: 10px; line-height: 18px; padding: 1px 8px; border-radius: 7px; white-space: nowrap; max-width: 60vw; overflow: hidden; text-overflow: ellipsis; }
  .atn-pin { position: fixed; width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.14); transform: translate(-50%, -50%); transition: transform .1s ease; }
  .atn-pin:hover { transform: translate(-50%, -50%) scale(1.12); }
  .atn-popup, .atn-panel { pointer-events: auto; background-color: var(--atn-bg); background-image: var(--atn-stars), var(--atn-splatter); background-size: 150px 150px, cover; background-repeat: repeat, no-repeat; background-position: 0 0, center; -webkit-backdrop-filter: blur(20px) saturate(1.4); backdrop-filter: blur(20px) saturate(1.4); color: var(--atn-text); border: 1px solid var(--atn-border); border-radius: var(--atn-radius); box-shadow: 0 16px 48px rgba(0,0,0,.55); font-size: 12.5px; }
  .atn-popup { position: fixed; width: 320px; padding: 14px; }
  .atn-src { color: var(--atn-muted); font-family: var(--atn-mono); font-size: 11px; margin-bottom: 8px; word-break: break-all; }
  .atn-src::before { content: "# "; }
  /* terminal command line: prompt glyph + borderless input, block caret */
  .atn-cmd { display: flex; gap: 8px; align-items: flex-start; }
  .atn-item .atn-cmd { padding-left: 20px; margin-top: 6px; }
  .atn-prompt { color: var(--atn-accent); font-weight: 700; flex: none; line-height: 1.5; user-select: none; }
  .atn-input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; resize: none; overflow: hidden; margin: 0; padding: 0; color: var(--atn-text); font: inherit; font-family: var(--atn-mono); line-height: 1.5; caret-color: var(--atn-accent); caret-shape: block; }
  .atn-input::placeholder { color: var(--atn-muted); }
  .atn-cmdhint { color: var(--atn-muted); font-size: 10.5px; margin: 8px 0 0 20px; }
  .atn-cmdhint b { color: var(--atn-text); font-weight: 600; }
  .atn-btn { background: none; color: var(--atn-muted); border: 0; padding: 2px 0; font: inherit; font-size: 11px; cursor: pointer; transition: color .12s ease; }
  .atn-btn:hover { color: var(--atn-text); }
  .atn-panel { position: fixed; right: 14px; bottom: 68px; width: 380px; max-height: 64vh; overflow-y: auto; padding: 14px 16px; }
  .atn-panel h3 { margin: 0 0 14px; font-size: 12px; font-weight: 500; letter-spacing: .3px; color: var(--atn-muted); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
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
  .atn-msg .atn-who { color: var(--atn-accent); }
  .atn-msg .atn-pfx { color: var(--atn-muted); margin-right: 6px; }
  .atn-item .atn-actions { display: flex; gap: 14px; margin: 7px 0 0; padding-left: 20px; }
  .atn-item .atn-actions button { background: none; border: 0; color: var(--atn-muted); font: inherit; font-size: 11px; cursor: pointer; padding: 0; transition: color .12s ease; }
  .atn-item .atn-actions button:hover { color: var(--atn-text); }
  .atn-empty { color: var(--atn-muted); padding: 4px 0 4px 20px; }
  .atn-hint { position: fixed; left: 50%; top: 14px; transform: translateX(-50%); background: var(--atn-bg); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border: 1px solid var(--atn-border); color: var(--atn-muted); padding: 5px 14px; border-radius: 8px; font-size: 11px; box-shadow: 0 8px 24px rgba(0,0,0,.4); pointer-events: none; }
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

    function renderPanel(focusId) {
      panel.style.display = active ? 'block' : 'none';
      panel.textContent = '';
      panelSig = JSON.stringify(annotations);
      const h = document.createElement('h3');
      h.textContent = `annotations (${annotations.length})`;
      const done = annotations.filter((a) => a.status === 'resolved' || a.status === 'dismissed').length;
      if (done) {
        const clear = document.createElement('button');
        clear.className = 'atn-clear';
        clear.textContent = `clear done (${done})`;
        clear.onclick = () => server.send('astrotation:clear', {});
        h.appendChild(clear);
      }
      panel.appendChild(h);

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
            who.className = 'atn-who';
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
        actions.append(replyBtn, delBtn);
        item.appendChild(actions);

        // Re-open the reply box across rebuilds so an in-flight draft isn't lost.
        if (replyDraft?.id === a.id) openReply(item, a);

        panel.appendChild(item);
      });

      if (annotations.length) {
        const copy = document.createElement('button');
        copy.className = 'atn-btn';
        copy.style.marginTop = '4px';
        copy.textContent = 'copy markdown';
        copy.onclick = () => navigator.clipboard.writeText(annotationsToMarkdown(annotations));
        panel.appendChild(copy);
      }
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
