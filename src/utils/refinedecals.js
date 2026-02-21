// src/utils/refinedecals.js
export function refineDecals(code) {
    let out = code;

    const defs = [...out.matchAll(
        /(function|var|let|const)\s+(_0x[a-f0-9]+)/g
    )];

    for (const [, type, name] of defs) {
        const usage = new RegExp(`\\b${name}\\b`, 'g');
        const count = (out.match(usage) || []).length;

        // defined but never used
        if (count <= 1) {
            out = out.replace(
                new RegExp(
                    `${type}\\s+${name}[\\s\\S]*?(;|\\})`,
                    'g'
                ),
                ''
            );
        }
    }

    // Remove obfuscation IIFEs
    out = out.replace(
        /\(function\s*\(.*?\)\s*\{[\s\S]*?\}\s*\)\s*\(.*?\);?/g,
        ''
    );

    return out.replace(/^\s*[\r\n]/gm, '').trim();
}