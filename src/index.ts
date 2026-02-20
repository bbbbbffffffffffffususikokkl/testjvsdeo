/**
 * Cloudflare Worker entry point for the obfuscator.io deobfuscator.
 *
 * Exposes a single HTTP endpoint:
 *   POST /deobfuscate
 *     Body (JSON): { "source": "<obfuscated JS>", "config"?: { ... } }
 *     Response (JSON): { "output": "<deobfuscated JS>" }
 *                   or { "error": "<message>" }
 *
 * GET / returns a simple HTML playground form.
 */

import { deobfuscate } from './engine';
import { defaultConfig, Config } from './deobfuscator/config';

export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // ── CORS preflight ────────────────────────────────────────────────
        if (request.method === 'OPTIONS') {
            return corsResponse(new Response(null, { status: 204 }));
        }

        // ── POST /deobfuscate ─────────────────────────────────────────────
        if (request.method === 'POST' && url.pathname === '/deobfuscate') {
            return corsResponse(await handleDeobfuscate(request));
        }

        // ── GET / – minimal HTML playground ──────────────────────────────
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
            return corsResponse(new Response(htmlPlayground(), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }));
        }

        return corsResponse(new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
};

// ── Handler ───────────────────────────────────────────────────────────────────

async function handleDeobfuscate(request: Request): Promise<Response> {
    let body: { source?: string; config?: Partial<Config> };

    try {
        body = await request.json() as { source?: string; config?: Partial<Config> };
    } catch {
        return jsonError('Invalid JSON body', 400);
    }

    if (typeof body.source !== 'string' || body.source.trim() === '') {
        return jsonError('Missing or empty "source" field', 400);
    }

    const config: Config = { ...defaultConfig, silent: true, ...body.config };

    try {
        const output = deobfuscate(body.source, config);
        return new Response(JSON.stringify({ output }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonError(`Deobfuscation failed: ${message}`, 500);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function corsResponse(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

// ── Minimal HTML playground ───────────────────────────────────────────────────

function htmlPlayground(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>obfuscator.io Deobfuscator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 1rem; }
    h1 { margin-bottom: 1rem; font-size: 1.2rem; color: #9cdcfe; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; height: calc(100vh - 6rem); }
    textarea { width: 100%; height: 100%; background: #252526; color: #d4d4d4; border: 1px solid #3c3c3c; padding: 0.5rem; resize: none; font-size: 0.85rem; }
    button { margin-top: 0.5rem; padding: 0.4rem 1.2rem; background: #0e639c; color: #fff; border: none; cursor: pointer; font-size: 0.9rem; }
    button:hover { background: #1177bb; }
    #status { margin-top: 0.4rem; font-size: 0.8rem; color: #ce9178; }
  </style>
</head>
<body>
  <h1>obfuscator.io Deobfuscator — Cloudflare Worker</h1>
  <div class="grid">
    <textarea id="input" placeholder="Paste obfuscated JavaScript here…"></textarea>
    <textarea id="output" placeholder="Deobfuscated output will appear here…" readonly></textarea>
  </div>
  <button onclick="run()">Deobfuscate</button>
  <span id="status"></span>
  <script>
    async function run() {
      const source = document.getElementById('input').value;
      const status = document.getElementById('status');
      status.textContent = 'Running…';
      try {
        const res = await fetch('/deobfuscate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source })
        });
        const data = await res.json();
        if (data.error) { status.textContent = 'Error: ' + data.error; }
        else { document.getElementById('output').value = data.output; status.textContent = 'Done.'; }
      } catch (e) { status.textContent = 'Request failed: ' + e; }
    }
  </script>
</body>
</html>`;
}
