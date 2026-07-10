import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AnnotationStore } from './store.js';
import { startMcpHttp } from './mcp.js';

const ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2.5" fill="currentColor"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" stroke="currentColor" stroke-width="1.5"/></svg>`;

/**
 * Astrotation — visual feedback for AI coding agents on Astro sites.
 * Dev-only: adds a Dev Toolbar app (annotate elements on the page) and hosts
 * an MCP server so agents (Claude Code etc.) receive annotations live.
 *
 * @param {{ port?: number, file?: string }} opts
 *   port — MCP HTTP port (default 7133), endpoint http://localhost:{port}/mcp
 *   file — annotations store path, relative to project root (default .astrotation/annotations.json)
 */
export default function astrotation(opts = {}) {
  const port = opts.port ?? 7133;
  let httpServer;
  let store;

  return {
    name: 'astrotation',
    hooks: {
      'astro:config:setup': ({ command, addDevToolbarApp }) => {
        if (command !== 'dev') return;
        addDevToolbarApp({
          id: 'astrotation',
          name: 'Astrotation',
          icon: ICON,
          entrypoint: fileURLToPath(new URL('./toolbar.js', import.meta.url)),
        });
      },

      'astro:server:setup': ({ server, toolbar, logger }) => {
        if (!toolbar) {
          logger.warn('Astro dev toolbar disabled — astrotation needs it. Enable devToolbar in config.');
          return;
        }
        const root = server.config.root;
        const file = path.resolve(root, opts.file ?? '.astrotation/annotations.json');
        store = new AnnotationStore(file);
        store.on('error', (e) => logger.warn(`annotations store: ${e.message}`));

        const pushState = () =>
          toolbar.send('astrotation:state', { annotations: store.list() });

        toolbar.on('astrotation:sync', pushState);
        toolbar.on('astrotation:add', (a) => store.add(a));
        toolbar.on('astrotation:delete', ({ id }) => store.remove(id));
        toolbar.on('astrotation:owner-reply', ({ id, message }) => store.reply(id, 'owner', message));
        toolbar.on('astrotation:set-status', ({ id, status }) => store.update(id, { status }));
        toolbar.on('astrotation:clear', () => store.clear());
        store.on('change', pushState);

        httpServer = startMcpHttp(store, port, logger);
      },

      'astro:server:done': () => {
        httpServer?.close();
        store?.close();
      },
    },
  };
}
