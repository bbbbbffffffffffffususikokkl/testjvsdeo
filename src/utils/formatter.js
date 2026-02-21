// src/utils/formatter.js
export function beautify(code) {
    let indent = 0;
    let out = '';

    const tokens = code
        .replace(/;/g, ';\n')
        .replace(/{/g, '{\n')
        .replace(/}/g, '\n}\n')
        .split('\n');

    for (let line of tokens) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('}')) indent--;

        out += '    '.repeat(Math.max(0, indent)) + line + '\n';

        if (line.endsWith('{')) indent++;
    }

    return out.trim();
}
