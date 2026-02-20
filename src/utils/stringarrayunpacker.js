export function unpackStrings(code) {
    let unpacked = code;

    // 1. Find ANY large array: const name = ['a', 'b'];
    // This regex looks for a constant assigned to an array of strings
    const arrayRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*\[((?:['"].*?['"]\s*,?\s*)+)\];/g;
    let arrayMatch;

    while ((arrayMatch = arrayRegex.exec(unpacked)) !== null) {
        const arrayName = arrayMatch[1];
        const rawContent = arrayMatch[2];
        
        // Parse strings properly even if they have commas inside quotes
        const strings = rawContent.match(/(['"])(?:(?!\1|\\).|\\.)*\1/g)
                                  .map(s => s.slice(1, -1));

        // 2. Find the Accessor Function UNIVERSALLY
        // Instead of looking for a pattern, we look for any function that references 'arrayName'
        const accessorRegex = new RegExp(
            `(?:function|const|var)\\s+([a-zA-Z0-9_$]+)\\s*=?\\s*\\(.*?\\)\\s*\\{?[\\s\\S]*?\\b${arrayName}\\b[\\s\\S]*?\\}?`, 
            'g'
        );
        
        let accessorMatch;
        while ((accessorMatch = accessorRegex.exec(unpacked)) !== null) {
            const funcName = accessorMatch[1];
            if (funcName === arrayName) continue; // Skip the array itself

            // 3. Replace calls like funcName(0x1) or funcName(5)
            // This handles Hex (0x5), Dec (5), and even simple math (5 - 0)
            const callRegex = new RegExp(`${funcName}\\s*\\((0x[0-9a-fA-F]+|[0-9]+|.*?)\\)`, 'g');
            
            unpacked = unpacked.replace(callRegex, (match, indexExpr) => {
                try {
                    // Evaluate the index (handles 0x5, 10, or 2 + 3)
                    // We use a safe evaluation for simple math expressions
                    const index = eval(indexExpr); 
                    const val = strings[index];
                    return val ? `'${val}'` : match;
                } catch {
                    return match;
                }
            });
        }
    }

    return unpacked;
}
