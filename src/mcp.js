import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const json = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});

export function buildServer(store) {
  const s = new McpServer({ name: 'astrotation', version: '0.1.0' });

  s.registerTool(
    'astrotation_list',
    {
      description:
        'List page annotations the site owner created in the Astro dev toolbar. Each annotation carries the owner note plus element context: CSS selector, Astro source file:line (sourceFile/sourceLoc), Tailwind classes, computed styles, text excerpt.',
      inputSchema: {
        status: z.enum(['pending', 'acknowledged', 'resolved', 'dismissed']).optional(),
        page: z.string().optional().describe('Filter by pathname, e.g. "/"'),
      },
    },
    async ({ status, page }) => json(store.list({ status, page }))
  );

  s.registerTool(
    'astrotation_get',
    {
      description:
        'Fetch one annotation by id with full detail: owner note, thread, Astro source file:line, selector, Tailwind classes, computed styles, captured outerHTML, bounding box. Use to load context before editing the source.',
      inputSchema: { id: z.string() },
    },
    async ({ id }) => json(store.get(id) ?? { error: `no annotation ${id}` })
  );

  s.registerTool(
    'astrotation_watch',
    {
      description:
        'Block until the owner creates new annotations or replies, then return the batch. Use in a loop for hands-free mode: watch → acknowledge → fix → resolve → watch again. Returns { annotations, replies, timedOut }.',
      inputSchema: {
        timeoutSec: z.number().min(5).max(600).optional()
          .describe('Give up after this many seconds (default 120)'),
      },
    },
    async ({ timeoutSec = 120 }) => json(await store.watch(timeoutSec * 1000))
  );

  s.registerTool(
    'astrotation_acknowledge',
    {
      description: 'Mark an annotation as seen/being worked on. Shows as "in progress" in the owner overlay.',
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      const a = store.update(id, { status: 'acknowledged' });
      return json(a ?? { error: `no annotation ${id}` });
    }
  );

  s.registerTool(
    'astrotation_resolve',
    {
      description: 'Mark an annotation as fixed. Summary is shown to the owner in the overlay.',
      inputSchema: {
        id: z.string(),
        summary: z.string().describe('One-two sentences: what was changed'),
      },
    },
    async ({ id, summary }) => {
      const a = store.update(id, { status: 'resolved', resolution: summary });
      if (a) store.reply(id, 'agent', summary);
      return json(a ?? { error: `no annotation ${id}` });
    }
  );

  s.registerTool(
    'astrotation_dismiss',
    {
      description: 'Dismiss an annotation without changes (with a reason the owner sees).',
      inputSchema: { id: z.string(), reason: z.string() },
    },
    async ({ id, reason }) => {
      const a = store.update(id, { status: 'dismissed', resolution: reason });
      if (a) store.reply(id, 'agent', reason);
      return json(a ?? { error: `no annotation ${id}` });
    }
  );

  s.registerTool(
    'astrotation_reply',
    {
      description: 'Ask the owner a clarifying question on an annotation thread. The question appears in the overlay; the owner reply arrives via astrotation_watch or astrotation_list.',
      inputSchema: { id: z.string(), message: z.string() },
    },
    async ({ id, message }) => {
      const a = store.reply(id, 'agent', message);
      return json(a ?? { error: `no annotation ${id}` });
    }
  );

  s.registerTool(
    'astrotation_clear',
    {
      description:
        'Housekeeping: bulk-remove annotations by status. Defaults to clearing resolved+dismissed once the owner has seen them. Returns the number removed.',
      inputSchema: {
        status: z
          .array(z.enum(['pending', 'acknowledged', 'resolved', 'dismissed']))
          .optional()
          .describe('Statuses to remove (default ["resolved","dismissed"])'),
      },
    },
    async ({ status }) => json({ removed: store.clear(status ? { status } : undefined) })
  );

  return s;
}

/** Streamable HTTP MCP endpoint at /mcp (stateless: fresh server per request). */
export function startMcpHttp(store, port, logger) {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, annotations: store.annotations.length }));
      return;
    }
    if (!req.url.startsWith('/mcp')) {
      res.statusCode = 404;
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end();
      return;
    }
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const mcp = buildServer(store);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => {
        transport.close();
        mcp.close();
      });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
    } catch (e) {
      logger.error(`MCP request failed: ${e.message}`);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    }
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      logger.warn(
        `port ${port} busy — MCP not started (another dev server running astrotation?). Set a different port in astrotation({ port }).`
      );
    } else {
      logger.error(`MCP server error: ${e.message}`);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    logger.info(`MCP ready: http://localhost:${port}/mcp  (claude mcp add --transport http astrotation http://localhost:${port}/mcp)`);
  });
  return server;
}
