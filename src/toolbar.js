import { defineToolbarApp } from 'astro/toolbar';

const STATUS_COLOR = {
  pending: '#f59e0b',
  acknowledged: '#4d84ff',
  resolved: '#22c55e',
  dismissed: '#9ca3af',
};

const STYLE = `
  .atn-layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  .atn-hl { position: fixed; border: 1.5px solid #4d84ff; background: rgba(77,132,255,.08); border-radius: 2px; display: none; transition: all .06s linear; }
  .atn-hl-label { position: absolute; top: -22px; left: -1.5px; background: #16307e; color: #fff; font-size: 10px; line-height: 16px; padding: 1px 6px; border-radius: 3px; white-space: nowrap; max-width: 60vw; overflow: hidden; text-overflow: ellipsis; }
  .atn-pin { position: fixed; width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer; box-shadow: 0 1px 4px rgba(0,7,13,.35); transform: translate(-50%, -50%); }
  .atn-popup, .atn-panel { pointer-events: auto; background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,7,13,.5); font-size: 12px; }
  .atn-popup { position: fixed; width: 300px; padding: 10px; }
  .atn-popup .atn-src { color: #8ab8ff; font-size: 10px; margin-bottom: 6px; word-break: break-all; }
  .atn-popup textarea, .atn-panel textarea { width: 100%; box-sizing: border-box; background: #010409; color: #e6edf3; border: 1px solid #30363d; border-radius: 4px; padding: 6px; font: inherit; resize: vertical; min-height: 52px; }
  .atn-btn { background: #4d84ff; color: #fff; border: 0; border-radius: 4px; padding: 5px 12px; font: inherit; font-weight: 600; cursor: pointer; }
  .atn-btn.atn-ghost { background: transparent; color: #9ca3af; }
  .atn-row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; }
  .atn-panel { position: fixed; right: 12px; bottom: 64px; width: 340px; max-height: 60vh; overflow-y: auto; padding: 10px; }
  .atn-panel h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: #8ab8ff; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .atn-clear { background: none; border: 0; color: #6e7681; font: inherit; font-size: 10px; text-transform: none; letter-spacing: 0; cursor: pointer; text-decoration: underline; }
  .atn-clear:hover { color: #e6edf3; }
  .atn-item { border: 1px solid #21262d; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .atn-item .atn-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .atn-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .atn-item .atn-el { color: #8ab8ff; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .atn-item .atn-comment { margin: 4px 0; }
  .atn-thread { border-left: 2px solid #30363d; margin: 6px 0 0; padding-left: 8px; display: flex; flex-direction: column; gap: 4px; }
  .atn-msg { font-size: 11px; }
  .atn-msg b { color: #8ab8ff; }
  .atn-item .atn-actions { display: flex; gap: 8px; margin-top: 6px; }
  .atn-item .atn-actions button { background: none; border: 0; color: #9ca3af; font: inherit; font-size: 10px; cursor: pointer; padding: 0; text-decoration: underline; }
  .atn-empty { color: #6e7681; text-align: center; padding: 12px 0; }
  .atn-hint { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); background: #16307e; color: #fff; padding: 4px 14px; border-radius: 999px; font-size: 11px; pointer-events: none; }
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

/** Trimmed outerHTML so the agent sees real markup without dumping the subtree. */
function outerHtmlExcerpt(el, max = 600) {
  const html = (el.outerHTML ?? '').replace(/\s+/g, ' ').trim();
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
    const loc = a.sourceFile ? `${a.sourceFile}${a.sourceLoc ? `:${a.sourceLoc}` : ''}` : a.selector;
    out += `${i + 1}. **${a.element}** — \`${loc}\``;
    if (a.status && a.status !== 'pending') out += ` _(${a.status})_`;
    out += `\n   ${a.comment}\n`;
    if (a.section) out += `   · under "${a.section}"\n`;
    if (a.classes) out += `   · classes: \`${a.classes}\`\n`;
    if (a.selectedText) out += `   · re: "${a.selectedText.slice(0, 60)}"\n`;
  });
  return out;
}

export default defineToolbarApp({
  init(canvas, app, server) {
    let active = false;
    let annotations = [];
    let openPopup = null;
    let hoverEl = null;

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
          const pin = document.createElement('div');
          pin.className = 'atn-pin';
          pin.textContent = String(i + 1);
          pin.style.background = STATUS_COLOR[a.status] ?? STATUS_COLOR.pending;
          pin.style.left = `${a.box.x + a.box.w / 2 - scrollX}px`;
          pin.style.top = `${a.box.y - scrollY}px`;
          pin.title = a.comment;
          pin.onclick = () => renderPanel(a.id);
          pinsWrap.appendChild(pin);
        });
    }
    addEventListener('scroll', () => active && renderPins(), { passive: true });
    addEventListener('resize', () => active && renderPins(), { passive: true });

    /* ---------- panel ---------- */
    function renderPanel(focusId) {
      panel.style.display = active ? 'block' : 'none';
      panel.textContent = '';
      const h = document.createElement('h3');
      h.textContent = `Annotations (${annotations.length})`;
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
        if (a.id === focusId) item.style.borderColor = '#4d84ff';

        const meta = document.createElement('div');
        meta.className = 'atn-meta';
        const dot = document.createElement('span');
        dot.className = 'atn-dot';
        dot.style.background = STATUS_COLOR[a.status] ?? STATUS_COLOR.pending;
        const el = document.createElement('span');
        el.className = 'atn-el';
        el.textContent = a.sourceFile
          ? `${a.sourceFile.split('/').pop()}${a.sourceLoc ? `:${a.sourceLoc}` : ''}`
          : a.selector;
        meta.append(dot, el);
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
            const who = document.createElement('b');
            who.textContent = m.from === 'agent' ? 'agent: ' : 'me: ';
            msg.appendChild(who);
            msg.appendChild(document.createTextNode(m.message));
            th.appendChild(msg);
          });
          item.appendChild(th);
        }

        const actions = document.createElement('div');
        actions.className = 'atn-actions';
        const replyBtn = document.createElement('button');
        replyBtn.textContent = 'reply';
        replyBtn.onclick = () => {
          if (item.querySelector('textarea')) return;
          const ta = document.createElement('textarea');
          ta.placeholder = 'Reply to agent…';
          const send = document.createElement('button');
          send.textContent = 'send';
          send.onclick = () => {
            if (!ta.value.trim()) return;
            server.send('astrotation:owner-reply', { id: a.id, message: ta.value.trim() });
            ta.remove();
            send.remove();
          };
          item.append(ta, send);
          ta.focus();
        };
        const delBtn = document.createElement('button');
        delBtn.textContent = 'delete';
        delBtn.onclick = () => server.send('astrotation:delete', { id: a.id });
        actions.append(replyBtn, delBtn);
        item.appendChild(actions);

        panel.appendChild(item);
      });

      if (annotations.length) {
        const copy = document.createElement('button');
        copy.className = 'atn-btn';
        copy.textContent = 'Copy markdown';
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
      src.textContent = capture.sourceFile
        ? `${capture.sourceFile}${capture.sourceLoc ? `:${capture.sourceLoc}` : ''}`
        : capture.selector;
      popup.appendChild(src);
      if (!capture.sourceFile) {
        resolveSource(capture.selector).then((res) => {
          if (res.sourceFile) {
            Object.assign(capture, res);
            src.textContent = `${res.sourceFile}${res.sourceLoc ? `:${res.sourceLoc}` : ''}`;
          }
        });
      }

      const ta = document.createElement('textarea');
      ta.placeholder = 'What should change here?';
      popup.appendChild(ta);

      const row = document.createElement('div');
      row.className = 'atn-row';
      const cancel = document.createElement('button');
      cancel.className = 'atn-btn atn-ghost';
      cancel.textContent = 'Cancel';
      cancel.onclick = closePopup;
      const save = document.createElement('button');
      save.className = 'atn-btn';
      save.textContent = 'Save';
      save.onclick = () => {
        if (!ta.value.trim()) return;
        server.send('astrotation:add', { ...capture, comment: ta.value.trim() });
        closePopup();
      };
      row.append(cancel, save);
      popup.appendChild(row);

      layer.appendChild(popup);
      openPopup = popup;
      ta.focus();
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save.onclick();
        e.stopPropagation();
      });
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
      renderPanel();
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
