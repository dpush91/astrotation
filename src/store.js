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
 *   status: 'pending'|'acknowledged'|'resolved'|'dismissed',
 *   thread: [{ from: 'agent'|'owner', message, at }], resolution }
 */
export class AnnotationStore extends EventEmitter {
  constructor(file) {
    super();
    this.setMaxListeners(50);
    this.file = file;
    this.annotations = [];
    this.load();
  }

  load() {
    try {
      this.annotations = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.annotations = [];
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.annotations, null, 2));
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
   * Block until new annotations or owner replies appear, then return the
   * batch (collects for `batchMs` after the first event so rapid-fire
   * annotations arrive together). Resolves { annotations, replies, timedOut }.
   */
  watch(timeoutMs, batchMs = 1500) {
    return new Promise((resolve) => {
      const annotations = [];
      const replies = [];
      let batchTimer = null;

      const finish = (timedOut = false) => {
        this.off('new', onNew);
        this.off('owner-reply', onReply);
        clearTimeout(timeoutTimer);
        clearTimeout(batchTimer);
        resolve({ annotations, replies, timedOut });
      };

      const arm = () => {
        if (!batchTimer) batchTimer = setTimeout(() => finish(false), batchMs);
      };
      const onNew = (a) => { annotations.push(a); arm(); };
      const onReply = (a) => { replies.push(a); arm(); };

      this.on('new', onNew);
      this.on('owner-reply', onReply);
      const timeoutTimer = setTimeout(() => finish(true), timeoutMs);
    });
  }
}
