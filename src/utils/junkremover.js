export function removeJunk(code) {
    let cleaned = code;

    // 1. Remove specific MCBE anti-tamper patterns
    cleaned = cleaned.replace(/while\s*\(!!\[\]\)\s*\{\}/g, ""); // Remove infinite loops
    
    // 2. Dead Code Elimination (DCE)
    // Find variables/functions that are defined but never called
    const lines = cleaned.split('\n');
    let words = cleaned.match(/[a-zA-Z0-9_$]+/g) || [];
    
    cleaned = lines.filter(line => {
        const decl = line.match(/(?:const|var|let|function)\s+([a-zA-Z0-9_$]+)/);
        if (decl) {
            const name = decl[1];
            // If the name only appears once in the whole file, it's unused
            const count = words.filter(w => w === name).length;
            return count > 1; 
        }
        return true;
    }).join('\n');

    return cleaned.replace(/\n\s*\n/g, '\n').trim();
}
