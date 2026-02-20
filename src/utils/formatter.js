export function beautify(code) {
    let indent = 0;
    const lines = code.split('\n');
    return lines.map(line => {
        line = line.trim();
        if (line.match(/[}\]]/)) indent--;
        const formatted = "    ".repeat(Math.max(0, indent)) + line;
        if (line.match(/[{[]/)) indent++;
        return formatted;
    }).join('\n');
}
