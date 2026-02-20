import { deobfuscate } from './engine.js';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/process") {
            const startTime = Date.now();
            try {
                const { code } = await request.json();
                const result = deobfuscate(code, startTime);
                
                return new Response(JSON.stringify({ result }), {
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                return new Response(JSON.stringify({ result: "Error: " + err.message }), { status: 500 });
            }
        }

        return env.ASSETS.fetch(request);
    }
};
