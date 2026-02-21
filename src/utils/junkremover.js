// src/utils/junkremover.js
export function removeJunk(code) {
    let cleaned = code;

    cleaned = cleaned.replace(/\((?:0x[0-9a-fA-F]+|[-+*/\s]|\d+)+\)/g, (match) => {
        try {
            const result = eval(match); 
            return typeof result === 'number' ? `0x${result.toString(16)}` : match;
        } catch { return match; }
    });

    cleaned = cleaned.replace(/var\s+[a-zA-Z0-9_$]+\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\(\);/g, "");
    cleaned = cleaned.replace(/while\s*\(!!\[\]\)\s*\{[\s\S]*?\}/g, "");

    const declRegex = /(?:var|let|const|function)\s+([a-zA-Z0-9_$]+)[\s\S]*?;/g;
    let match;
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

                const isProtected = line.includes('export') || ["onRun", "main"].includes(varName);
                if (occurrences === 1 && !isProtected) return false; 
            }
            return true;
        });
    }
    
    cleaned = finalLines.join('\n');

    return cleaned.replace(/\n\n+/g, '\n').trim();
}