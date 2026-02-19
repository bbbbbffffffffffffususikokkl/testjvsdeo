import { deobfuscate } from './utils/parser.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/process") {
      const { code } = await request.json();
      const result = deobfuscate(code);
      
      return new Response(JSON.stringify({ result }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
