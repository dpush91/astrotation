/**
 * Smoke test — no framework, just `node test/smoke.mjs`.
 * Exercises the store (CRUD, threads, clear, atomic reload) and the MCP tool
 * surface end-to-end via an in-memory client, plus the HTTP /health endpoint.
 * Exits non-zero on the first failure (used by prepublishOnly).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { AnnotationStore } from '../src/store.js';
import { buildServer, startMcpHttp } from '../src/mcp.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrotation-'));
const file = path.join(tmp, 'nested', 'annotations.json');
let passed = 0;
const ok = (label) => { passed++; console.log(`  ✓ ${label}`); };
const parse = (res) => JSON.parse(res.content[0].text);

const silentLogger = { info() {}, warn() {}, error() {} };

const SAMPLE = {
  page: '/', url: 'http://localhost:4321/', viewport: '1440x900',
  element: 'p', selector: 'section#hero > p',
  sourceFile: 'src/components/Hero.astro', sourceLoc: '49:8',
  classes: 'max-w-xs', section: 'Hero', role: null,
  styles: 'font-size: 14px', text: 'Senior product designer…',
  selectedText: null, outerHTML: '<p class="max-w-xs">Senior…</p>',
  box: { x: 980, y: 620, w: 320, h: 120 },
};

async function testStore() {
  console.log('store:');
  const store = new AnnotationStore(file);
  assert.equal(store.list().length, 0, 'starts empty');
  ok('starts empty (missing file → [])');

  const a = store.add({ ...SAMPLE, comment: 'make wider' });
  assert.equal(a.status, 'pending');
  assert.equal(a.id.length, 8);
  assert.ok(Array.isArray(a.thread));
  ok('add() defaults status=pending, 8-char id, empty thread');

  assert.ok(fs.existsSync(file), 'save() created the file (mkdir -p)');
  const reloaded = new AnnotationStore(file);
  assert.equal(reloaded.list().length, 1, 'persisted across reload');
  assert.equal(reloaded.get(a.id).comment, 'make wider');
  ok('atomic save persisted and reloads');

  assert.equal(fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith('.tmp')).length, 0);
  ok('no leftover .tmp files after atomic rename');

  store.update(a.id, { status: 'acknowledged' });
  assert.equal(store.get(a.id).status, 'acknowledged');
  ok('update() patches status');

  store.reply(a.id, 'owner', 'yes please');
  const t = store.get(a.id).thread;
  assert.equal(t.at(-1).from, 'owner');
  assert.equal(t.at(-1).message, 'yes please');
  ok('reply() appends to thread');

  store.update(a.id, { status: 'resolved' });
  const b = store.add({ ...SAMPLE, comment: 'second' });
  assert.equal(store.clear(), 1, 'clear() removes 1 resolved');
  assert.equal(store.list().length, 1, 'pending one survives');
  assert.equal(store.get(b.id).comment, 'second');
  ok('clear() drops resolved+dismissed only');

  // watch() resolves with the batch when a new annotation lands.
  const watching = store.watch(3000, 50);
  store.add({ ...SAMPLE, comment: 'live' });
  const batch = await watching;
  assert.equal(batch.timedOut, false);
  assert.equal(batch.annotations.length, 1);
  assert.equal(batch.annotations[0].comment, 'live');
  ok('watch() unblocks on new annotation with the batch');

  const timedOut = await store.watch(120, 50);
  assert.equal(timedOut.timedOut, true);
  ok('watch() reports timedOut when nothing happens');

  store.close();

  // File watch: an external write (another process / manual edit) reloads and
  // emits 'change', so the MCP never serves stale data.
  const wfile = path.join(tmp, 'watch.json');
  const watchStore = new AnnotationStore(wfile);
  const changed = new Promise((res, rej) => {
    watchStore.once('change', res);
    setTimeout(() => rej(new Error('watchFile did not fire')), 4000);
  });
  fs.writeFileSync(wfile, JSON.stringify(
    [{ id: 'ext12345', status: 'pending', thread: [], comment: 'external' }], null, 2));
  await changed;
  assert.equal(watchStore.list().length, 1);
  assert.equal(watchStore.get('ext12345').comment, 'external');
  watchStore.close();
  ok('store reloads on external file write (watchFile sync bus)');
}

async function testMcpTools() {
  console.log('mcp tools:');
  const store = new AnnotationStore(path.join(tmp, 'mcp.json'));
  const seed = store.add({ ...SAMPLE, comment: 'fix spacing' });

  const server = buildServer(store);
  const client = new Client({ name: 'smoke', version: '0' });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverT), client.connect(clientT)]);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    'astrotation_acknowledge', 'astrotation_clear', 'astrotation_dismiss',
    'astrotation_get', 'astrotation_list', 'astrotation_reply',
    'astrotation_resolve', 'astrotation_watch',
  ]);
  ok(`all 8 tools registered`);

  const listed = parse(await client.callTool({ name: 'astrotation_list', arguments: {} }));
  assert.equal(listed.length, 1);
  ok('astrotation_list returns seeded annotation');

  const got = parse(await client.callTool({ name: 'astrotation_get', arguments: { id: seed.id } }));
  assert.equal(got.outerHTML, SAMPLE.outerHTML);
  assert.equal(got.sourceFile, SAMPLE.sourceFile);
  ok('astrotation_get returns full detail incl. outerHTML');

  const miss = parse(await client.callTool({ name: 'astrotation_get', arguments: { id: 'nope' } }));
  assert.match(miss.error, /no annotation/);
  ok('astrotation_get on unknown id → error field');

  const ack = parse(await client.callTool({ name: 'astrotation_acknowledge', arguments: { id: seed.id } }));
  assert.equal(ack.status, 'acknowledged');
  ok('astrotation_acknowledge flips status');

  const filtered = parse(await client.callTool({
    name: 'astrotation_list', arguments: { status: 'acknowledged' },
  }));
  assert.equal(filtered.length, 1);
  const none = parse(await client.callTool({
    name: 'astrotation_list', arguments: { status: 'pending' },
  }));
  assert.equal(none.length, 0);
  ok('astrotation_list filters by status');

  const resolved = parse(await client.callTool({
    name: 'astrotation_resolve', arguments: { id: seed.id, summary: 'widened column' },
  }));
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolution, 'widened column');
  assert.equal(resolved.thread.at(-1).from, 'agent');
  ok('astrotation_resolve sets status + resolution + agent thread msg');

  const q = parse(await client.callTool({
    name: 'astrotation_reply', arguments: { id: seed.id, message: 'which breakpoint?' },
  }));
  assert.equal(q.thread.at(-1).message, 'which breakpoint?');
  ok('astrotation_reply appends agent question');

  const cleared = parse(await client.callTool({ name: 'astrotation_clear', arguments: {} }));
  assert.equal(cleared.removed, 1);
  assert.equal(store.list().length, 0);
  ok('astrotation_clear removes resolved');

  // watch tool returns a batch via the store.
  const watchP = client.callTool({ name: 'astrotation_watch', arguments: { timeoutSec: 5 } });
  await new Promise((r) => setTimeout(r, 100));
  store.add({ ...SAMPLE, comment: 'watched' });
  const w = parse(await watchP);
  assert.equal(w.timedOut, false);
  assert.equal(w.annotations[0].comment, 'watched');
  ok('astrotation_watch tool unblocks on new annotation');

  await client.close();
  await server.close();
}

async function testHealth() {
  console.log('http:');
  const store = new AnnotationStore(path.join(tmp, 'health.json'));
  store.add({ ...SAMPLE, comment: 'x' });
  const httpServer = startMcpHttp(store, 7188, silentLogger);
  await once(httpServer, 'listening');
  const health = await fetch('http://127.0.0.1:7188/health').then((r) => r.json());
  assert.equal(health.ok, true);
  assert.equal(health.annotations, 1);
  ok('/health reports ok + annotation count');

  const notFound = await fetch('http://127.0.0.1:7188/nope');
  assert.equal(notFound.status, 404);
  ok('unknown path → 404');

  const wrongMethod = await fetch('http://127.0.0.1:7188/mcp');
  assert.equal(wrongMethod.status, 405);
  ok('GET /mcp → 405 (POST only)');

  httpServer.close();
  await once(httpServer, 'close');
}

try {
  await testStore();
  await testMcpTools();
  await testHealth();
  console.log(`\n✅ smoke passed — ${passed} assertions`);
} catch (e) {
  console.error(`\n❌ smoke failed: ${e.message}`);
  console.error(e.stack);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
