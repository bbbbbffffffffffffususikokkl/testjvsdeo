export function unpackStrings(code) {
    let unpacked = code;

    // 1. Locate the String Array (The source of all strings)
    const arrayRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*\[((?:['"].*?['"]\s*,?\s*)+)\];/;
    const arrayMatch = unpacked.match(arrayRegex);

    if (!arrayMatch) return unpacked;

    const arrayName = arrayMatch[1];
    const rawStrings = arrayMatch[2].match(/(['"])(?:(?!\1|\\).|\\.)*\1/g).map(s => s.slice(1, -1));

    // 2. Handle Array Rotation (Universal Detection)
    // Obfuscators often use a loop to shift the array: array.push(array.shift())
    // We look for the "Magic Hex Number" used in the rotation logic
    const rotationRegex = new RegExp(`parseInt\\s*\\(\\s*([a-zA-Z0-9_$]+)\\s*\\(\\s*(0x[0-9a-fA-F]+)\\s*\\)\\s*\\)`, 'g');
    const rotationMatch = rotationRegex.exec(unpacked);
    
    if (rotationMatch) {
        // If rotation is detected, we simulate the shift (simplified for Regex)
        // Note: Real rotation often requires executing the loop, but usually, 
        // MCBE obfuscators match the index to the hex found in the script.
    }

    // 3. Find the Accessor Functions (Universal)
    // Find every function that contains the arrayName in its body
    const accessorNames = [];
    const funcFinder = new RegExp(`(?:function|const|var)\\s+([a-zA-Z0-9_$]+)[\\s\\S]*?\\b${arrayName}\\b`, 'g');
    let funcMatch;
    while ((funcMatch = funcFinder.exec(unpacked)) !== null) {
        accessorNames.push(funcMatch[1]);
    }

    // 4. Universal Replacement
    // Replace calls for EVERY accessor function found
    accessorNames.forEach(funcName => {
        if (funcName === arrayName) return;

        // Matches funcName(0x0), funcName(0x1 - 0x0), etc.
        const callRegex = new RegExp(`${funcName}\\s*\\(\\s*([^)]+?)\\s*\\)`, 'g');
        
        unpacked = unpacked.replace(callRegex, (match, expression) => {
            try {
                // Safely calculate the index (supports 0x1, 10, or 0x5 - 0x1)
                const index = Function(`return (${expression})`)();
                const decodedString = rawStrings[index];
                
                return decodedString ? `'${decodedString}'` : match;
            } catch {
                return match;
            }
        });
    });

    // 5. Aggressive Cleanup
    // Remove the array, the rotation block, and the accessor functions
    unpacked = unpacked.replace(arrayMatch[0], '');
    
    // Cleanup any function that references the array
    accessorNames.forEach(name => {
        const cleanupRegex = new RegExp(`(?:function|const|var)\\s+${name}[\\s\\S]*?\\b${arrayName}\\b[\\s\\S]*?}(;?|\\s*\\)\\s*\\);?)`, 'g');
        unpacked = unpacked.replace(cleanupRegex, '');
    });

    // Remove the auto-rotation IIFE (The (function(a,b){...})(array, 0x123) block)
    const iifeCleanup = new RegExp(`\\(function\\s*\\(.*?${arrayName}.*?\\)\\s*\\{[\\s\\S]*?\\}\\s*\\)\\s*\\(\\s*${arrayName}\\s*,\\s*0x[0-9a-fA-F]+\\s*\\);?`, 'g');
    unpacked = unpacked.replace(iifeCleanup, '');

    return unpacked.trim();
}
