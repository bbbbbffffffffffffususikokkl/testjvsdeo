// src/utils/junkremover.js
export function removeJunk(code) {
    let cleaned = code;

    // 1. Simplify Math/Arithmetic (Constant Folding)
    cleaned = cleaned.replace(/\((?:0x[0-9a-fA-F]+|[-+*/\s]|\d+)+\)/g, (match) => {
        try {
            const result = eval(match); // Safe for pure math expressions
            return typeof result === 'number' ? `0x${result.toString(16)}` : match;
        } catch { return match; }
    });

    // 2. Remove empty var declarations and "Self-Defending" blocks
    cleaned = cleaned.replace(/var\s+[a-zA-Z0-9_$]+\s*=\s*function\s*\(\)\s*\{[\s\S]*?\}\(\);/g, "");
    cleaned = cleaned.replace(/while\s*\(!!\[\]\)\s*\{[\s\S]*?\}/g, "");
    
    return cleaned.replace(/\n\s*\n/g, '\n').trim();
}
