import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Annotation store: JSON file persistence + events for MCP watch/live sync.
 *
 * Annotation shape:
 * { id, createdAt, page, url, viewport, element, selector, sourceFile,
 *   sourceLoc, classes, styles, text, selectedText, box, comment,
 *   status: 'pending'|'acknowledged'|'feedback'|'resolved'|'dismissed',
 *     ('feedback' = agent finished, awaiting owner review; owner resolves)
 *   thread: [{ from: 'agent'|'owner', message, at }], resolution }
 */
export class AnnotationStore extends EventEmitter {
  constructor(file) {
    super();
    this.setMaxListeners(50);
    this.file = file;
    this.annotations = [];
    this._raw = '[]';
    this.load();
    this._watch();
  }

  load() {
    try {
      this._raw = fs.readFileSync(this.file, 'utf8');
      this.annotations = JSON.parse(this._raw);
    } catch {
      this.annotations = [];
      this._raw = '[]';
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      // Atomic write: a crash mid-write can't leave a truncated/corrupt JSON.
      const raw = JSON.stringify(this.annotations, null, 2);
      const tmp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, raw);
      fs.renameSync(tmp, this.file);
      this._raw = raw; // so our own write is ignored by the file watcher
    } catch (e) {
      this.emit('error', e);
    }
  }

  /**
   * Watch the store file and reload on external writes. This keeps the
   * in-memory copy fresh when another process (a second dev server holding
   * the MCP port, or a manual edit) writes the same file, so the MCP never
   * serves stale data. The shared file doubles as a cross-process sync bus:
   * an agent resolving via one process turns the pin green in the overlay
   * served by another.
   */
  _watch() {
    try {
      this._watcher = fs.watchFile(this.file, { interval: 700 }, () => {
        let raw;
        try { raw = fs.readFileSync(this.file, 'utf8'); } catch { return; }
        if (raw === this._raw) return;            // our own write, or no real change
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return; } // ignore a partial read
        this._raw = raw;
        this.annotations = parsed;
        this.emit('change');
      });
      this._watcher?.unref?.(); // don't keep the process alive just for the poller
    } catch (e) {
      this.emit('error', e);
    }
  }

  close() {
    fs.unwatchFile(this.file);
  }

  list({ status, page } = {}) {
    return this.annotations.filter(
      (a) => (!status || a.status === status) && (!page || a.page === page)
    );
  }

  get(id) {
    return this.annotations.find((a) => a.id === id);
  }

  add(data) {
    const a = {
      id: randomUUID().slice(0, 8),
      createdAt: new Date().toISOString(),
      status: 'pending',
      thread: [],
      ...data,
    };
    this.annotations.push(a);
    this.save();
    this.emit('change');
    this.emit('new', a);
    return a;
  }

  update(id, patch) {
    const a = this.get(id);
    if (!a) return null;
    Object.assign(a, patch);
    this.save();
    this.emit('change');
    return a;
  }

  remove(id) {
    const i = this.annotations.findIndex((a) => a.id === id);
    if (i === -1) return false;
    this.annotations.splice(i, 1);
    this.save();
    this.emit('change');
    return true;
  }

  /** Bulk-remove annotations. Default clears resolved+dismissed (housekeeping). */
  clear({ status = ['resolved', 'dismissed'] } = {}) {
    const drop = new Set(Array.isArray(status) ? status : [status]);
    const before = this.annotations.length;
    this.annotations = this.annotations.filter((a) => !drop.has(a.status));
    const removed = before - this.annotations.length;
    if (removed) {
      this.save();
      this.emit('change');
    }
    return removed;
  }

  reply(id, from, message) {
    const a = this.get(id);
    if (!a) return null;
    a.thread.push({ from, message, at: new Date().toISOString() });
    this.save();
    this.emit('change');
    if (from === 'owner') this.emit('owner-reply', a);
    return a;
  }

  /**
   * Work that currently needs the agent, judged by whose move it is:
   * - annotations: pending items the agent hasn't picked up — unless the
   *   agent spoke last (an unanswered clarifying question stays parked).
   * - replies: acknowledged/feedback threads where the owner spoke last.
   * feedback/dismiss push an agent thread entry, so a handed-back item
   * doesn't re-deliver until the owner responds.
   */
  _pendingWork() {
    const lastFrom = (a) => a.thread.at(-1)?.from ?? null;
    return {
      annotations: this.annotations.filter(
        (a) => a.status === 'pending' && lastFrom(a) !== 'agent'
      ),
      replies: this.annotations.filter(
        (a) =>
          (a.status === 'acknowledged' || a.status === 'feedback') &&
          lastFrom(a) === 'owner'
      ),
    };
  }

  /**
   * Block until work needs the agent, then return the batch. Scan-based, not
   * event-based: anything created while no watch was active (agent busy
   * fixing the previous item) is returned immediately as backlog on the next
   * call instead of being lost. Rides the 'change' event, which also fires on
   * external file writes — a second process feeding the store wakes the watch
   * too. Collects for `batchMs` after the first deliverable so rapid-fire
   * annotations arrive together. Resolves { annotations, replies, timedOut }.
   */
  watch(timeoutMs, batchMs = 1500) {
    return new Promise((resolve) => {
      let batchTimer = null;

      const finish = (timedOut) => {
        this.off('change', check);
        clearTimeout(timeoutTimer);
        clearTimeout(batchTimer);
        resolve({ ...this._pendingWork(), timedOut });
      };

      const check = () => {
        const { annotations, replies } = this._pendingWork();
        if ((annotations.length || replies.length) && !batchTimer)
          batchTimer = setTimeout(() => finish(false), batchMs);
      };

      const timeoutTimer = setTimeout(() => finish(true), timeoutMs);
      this.on('change', check);
      check();
    });
  }
}
