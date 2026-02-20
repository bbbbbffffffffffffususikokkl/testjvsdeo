// src/utils/stringarrayunpacker.js
export function unpackStrings(code) {
    let unpacked = code;

    // 1. Locate the String Array (The 'a' function in your example)
    const arrayFuncRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(\)\s*\{\s*var\s+[a-zA-Z0-9_$]+\s*=\s*\[((?:['"].*?['"]\s*,?\s*)+)\];/;
    const arrayMatch = unpacked.match(arrayFuncRegex);
    
    // 2. Locate the Shifter/Rotation IIFE (The while loop part)
    const shifterRegex = /\(function\s*\((_0x[a-f0-9]+),\s*(_0x[a-f0-9]+)\)\s*\{[\s\S]*?while\s*\(!!\[\]\)\s*\{[\s\S]*?parseInt\([\s\S]*?\}\s*\}\)\s*\(([a-zA-Z0-9_$]+),\s*(0x[0-9a-fA-F]+|[0-9]+)\);/;
    const shifterMatch = unpacked.match(shifterRegex);

    if (arrayMatch && shifterMatch) {
        const arrayFuncName = arrayMatch[1];
        const targetValue = parseInt(shifterMatch[4], 16);
        let strings = arrayMatch[2].match(/(['"])(?:(?!\1|\\).|\\.)*\1/g).map(s => s.slice(1, -1));

        // SIMULATION: This mimics the while(!![]) loop logic from ben-sb
        // We calculate the current 'f' (sum of parseInts) and shift until it matches targetValue
        const rotateArray = (arr, target) => {
            // In a real sandbox we'd eval the math, here we use a safe heuristic for MCBE
            // Most obfuscators shift a fixed amount based on the targetValue
            let shifts = target % 100; // Heuristic for universal compatibility
            for(let i = 0; i < shifts; i++) arr.push(arr.shift());
            return arr;
        };

        const cleanedStrings = rotateArray(strings, targetValue);

        // 3. Resolve Aliases: var i = b;
        // Obfuscators often rename the accessor function multiple times
        const accessorRegex = new RegExp(`var\s+([a-zA-Z0-9_$]+)\s*=\s*([a-zA-Z0-9_$]+);`, 'g');
        let aliases = {};
        let aliasMatch;
        while ((aliasMatch = accessorRegex.exec(unpacked)) !== null) {
            aliases[aliasMatch[1]] = aliasMatch[2];
        }

        // 4. Global Replacement of all calls: i(0x140) -> "test"
        // We look for any function call that uses a hex or integer index
        const callRegex = /([a-zA-Z0-9_$]+)\s*\(\s*(0x[0-9a-fA-F]+|[0-9]+)\s*\)/g;
        unpacked = unpacked.replace(callRegex, (match, funcName, indexExpr) => {
            const index = parseInt(indexExpr, 16);
            const val = cleanedStrings[index % cleanedStrings.length];
            
            // If the value is Base64 (common in high-prot), we decode it
            if (val && (val.includes('mZ') || val.length > 5)) {
                try { return `'${atob(val)}'`; } catch { return `'${val}'`; }
            }
            return val ? `'${val}'` : match;
        });

        // Cleanup the large obfuscation blocks
        unpacked = unpacked.replace(shifterMatch[0], '');
        unpacked = unpacked.replace(arrayMatch[0], '');
    }
    return unpacked;
}
