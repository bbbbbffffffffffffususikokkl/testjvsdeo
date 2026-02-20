export function unpackStrings(code) {
    let unpacked = code;

    // 1. Locate the String Array
    const arrayRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*\[((?:['"].*?['"]\s*,?\s*)+)\];/;
    const arrayMatch = unpacked.match(arrayRegex);
    if (!arrayMatch) return unpacked;

    const arrayName = arrayMatch[1];
    let strings = arrayMatch[2].match(/(['"])(?:(?!\1|\\).|\\.)*\1/g).map(s => s.slice(1, -1));

    // 2. SIMULATE ROTATION (Crucial for MCBE)
    // Looks for the IIFE that rotates: (function(a, b){ ... })(_0x3e1a, 0x1)
    const rotationRegex = new RegExp(`\\(function\\s*\\(.*?${arrayName}.*?\\)\\s*\\{[\\s\\S]*?_0x[a-f0-9]+\\.push\\(.*?\\.shift\\(\\)\\)\\s*[\\s\\S]*?\\}\\s*\\)\\s*\\(\\s*${arrayName}\\s*,\\s*(0x[0-9a-fA-F]+|[0-9]+)\\s*\\);`);
    const rotationMatch = unpacked.match(rotationRegex);
    
    if (rotationMatch) {
        const count = parseInt(rotationMatch[1], rotationMatch[1].includes('0x') ? 16 : 10) + 1;
        for (let i = 0; i < count; i++) {
            strings.push(strings.shift());
        }
        unpacked = unpacked.replace(rotationMatch[0], ''); // Remove the rotation logic
    }

    // 3. Find Accessors & Replace
    const accessorNames = [];
    const funcFinder = new RegExp(`(?:function|const|var)\\s+([a-zA-Z0-9_$]+)[\\s\\S]*?\\b${arrayName}\\b`, 'g');
    let fMatch;
    while ((fMatch = funcFinder.exec(unpacked)) !== null) { accessorNames.push(fMatch[1]); }

    accessorNames.forEach(funcName => {
        if (funcName === arrayName) return;
        const callRegex = new RegExp(`${funcName}\\s*\\(\\s*([^)]+?)\\s*\\)`, 'g');
        unpacked = unpacked.replace(callRegex, (match, expr) => {
            try {
                const index = Function(`return (${expr})`)();
                return strings[index] ? `'${strings[index]}'` : match;
            } catch { return match; }
        });
        // Remove the accessor function
        const cleanup = new RegExp(`(?:function|const|var)\\s+${funcName}[\\s\\S]*?return\\s+${arrayName}.*?;?\\s*\\}?;?`, 'g');
        unpacked = unpacked.replace(cleanup, '');
    });

    unpacked = unpacked.replace(arrayMatch[0], ''); // Remove array
    return unpacked;
}
