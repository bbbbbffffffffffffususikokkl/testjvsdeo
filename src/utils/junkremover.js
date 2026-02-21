// src/utils/junkremover.js
export function removeJunk(code) {
    let cleaned = code;

    cleaned = cleaned.replace(/([a-zA-Z0-9_$])\s*\[\s*['"]([a-zA-Z_$][a-zA-Z0-9_$]*)['"]\s*\]/g, '$1.$2');

    cleaned = cleaned.replace(/\b0x([0-9a-fA-F]+)\b/g, (match, hex) => {
        const decimal = parseInt(hex, 16);
        return decimal < 65535 ? decimal.toString() : match;
    });

    cleaned = cleaned.replace(/\((?:[0-9a-fA-Fx\s]+|[-+*/]|\d+)+\)/g, (match) => {
        try {
            const result = eval(match); 
            return typeof result === 'number' ? result.toString() : match;
        } catch { return match; }
    });

    cleaned = cleaned.replace(/var\s+[a-zA-Z0-9_$]+\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\(\);/g, "");
    cleaned = cleaned.replace(/while\s*\(!!\[\]\)\s*\{[\s\S]*?\}/g, "");

    let lines = cleaned.split('\n');
    let finalLines = [...lines];

    for (let iteration = 0; iteration < 2; iteration++) {
        let currentCode = finalLines.join('\n');
        finalLines = finalLines.filter(line => {
            const m = /(?:var|let|const|function)\s+([a-zA-Z0-9_$]+)/.exec(line);
            if (m) {
                const varName = m[1];
                const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const occurrences = (currentCode.match(new RegExp('\\b' + escapedName + '\\b', 'g')) || []).length;
                
                const isProtected = line.includes('export') || ["onRun", "main", "constructor"].includes(varName);

                if (occurrences === 1 && !isProtected) return false; 
            }
            return true;
        });
    }
    
    cleaned = finalLines.join('\n');

    return cleaned.replace(/\n\n+/g, '\n').trim();
}