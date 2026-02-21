// src/utils/formatter.js
export function beautify(code) {
    let indent = 0;
    let out = '';

    for (const line of code.split('\n')) {
        const trimmed = line.trim();

        for (const c of trimmed) if (c === '}') indent--;

        out += '    '.repeat(Math.max(0, indent)) + trimmed + '\n';

        for (const c of trimmed) if (c === '{') indent++;
    }

    return out.trim();
}