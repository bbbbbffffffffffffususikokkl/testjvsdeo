export function unpackStrings(code) {
    let unpacked = code;

    // 1. Find the array (e.g., const _0x5a21 = ['log', 'hi'])
    const arrayRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*\[((?:['"].*?['"]\s*,?\s*)+)\];/;
    const arrayMatch = unpacked.match(arrayRegex);

    if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const rawContent = arrayMatch[2];
        
        // Extract strings into a real array
        const strings = rawContent.match(/(['"])(?:(?!\1|\\).|\\.)*\1/g)
                                  .map(s => s.slice(1, -1));

        // 2. Find the function name that uses this array
        // We look for any function name followed by the array name inside its body
        const funcPattern = new RegExp(`(?:function|const|var)\\s+([a-zA-Z0-9_$]+)[\\s\\S]*?\\b${arrayName}\\b`, 'g');
        const funcMatches = [...unpacked.matchAll(funcPattern)];

        funcMatches.forEach(match => {
            const funcName = match[1];
            if (funcName === arrayName) return;

            // 3. Find and replace calls: funcName(0x0)
            // This regex is more lenient with whitespace
            const callRegex = new RegExp(`${funcName}\\s*\\(\\s*(0x[0-9a-fA-F]+|[0-9]+)\\s*\\)`, 'g');
            
            unpacked = unpacked.replace(callRegex, (fullMatch, indexExpr) => {
                const index = indexExpr.startsWith('0x') ? parseInt(indexExpr, 16) : parseInt(indexExpr, 10);
                const val = strings[index];
                return val ? `'${val}'` : fullMatch;
            });
        });

        // 4. Cleanup: Remove the array and the accessor function to keep output clean
        // (Optional: Comment these out if you want to see them for debugging)
        unpacked = unpacked.replace(arrayMatch[0], '');
        // This removes the function block (matches from 'const/function funcName' to the next '};' or '}')
        const cleanupFunc = new RegExp(`(?:function|const|var)\\s+([a-zA-Z0-9_$]+)[\\s\\S]*?\\b${arrayName}\\b[\\s\\S]*?};?`, 'g');
        unpacked = unpacked.replace(cleanupFunc, '');
    }

    return unpacked.trim();
}
