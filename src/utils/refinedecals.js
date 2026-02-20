// src/utils/refinedecals.js

export function refineDecals(code) {
    let refined = code;

    // 1. Identify all remaining _0x names (arrays and functions)
    const decalPattern = /(?:var|const|let|function)\s+(_0x[a-f0-9]+)/g;
    let match;
    const namesToRemove = [];

    while ((match = decalPattern.exec(refined)) !== null) {
        const name = match[1];
        
        // Count occurrences of this name in the code
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        const count = (refined.match(regex) || []).length;

        // If it only appears once (the definition), it's a "Decal" (useless)
        if (count <= 1) {
            namesToRemove.push(name);
        }
    }

    // 2. Remove the definitions of those useless names
    namesToRemove.forEach(name => {
        // Removes: var _0x1a = [...]; OR function _0x2b(){...}
        const removeRegex = new RegExp(`(?:var|const|let|function)\\s+${name}\\s*(=[\\s\\S]*?;|\\([\\s\\S]*?\\)\\s*\\{[\\s\\S]*?\\};?)`, 'g');
        refined = refined.replace(removeRegex, '');
    });

    // 3. Remove Obfuscation Logic "Decals" (IIFEs that shift/rotate)
    // Matches: (function(a){...})(_0x1a);
    refined = refined.replace(/\(function\s*\(.*?\)\s*\{[\s\S]*?\}\s*\)\s*\(_0x[a-f0-9]+\s*\);?/g, '');

    // 4. Final Cleanup: Convert brackets to dots (console['warn'] -> console.warn)
    refined = refined.replace(/([a-zA-Z0-9_$]+)\[['"]([^'"]+)['"]\]/g, '$1.$2');

    // 5. Purge empty lines and comments left behind
    return refined.replace(/^\s*[\r\n]/gm, '').trim();
}
