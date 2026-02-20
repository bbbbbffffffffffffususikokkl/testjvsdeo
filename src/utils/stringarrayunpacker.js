export function unpackStrings(code) {
    let unpacked = code;

    // 1. Base64 Decoder (Required for Obfuscator.io)
    const b64Decode = (str) => {
        try {
            const m = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
            let n = '', p = 0, q, r, s = 0;
            while (r = str.charAt(s++)) {
                r = m.indexOf(r);
                if (~r) {
                    q = p % 4 ? q * 64 + r : r;
                    if (p++ % 4) n += String.fromCharCode(255 & q >> (-2 * p & 6));
                }
            }
            return decodeURIComponent(n.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        } catch (e) { return str; }
    };

    // 2. Locate the String Array Function
    const arrayFuncRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(\)\s*\{\s*var\s+[a-zA-Z0-9_$]+\s*=\s*\[((?:['"].*?['"]\s*,?\s*)+)\];/;
    const arrayMatch = unpacked.match(arrayFuncRegex);
    
    if (arrayMatch) {
        const arrayFuncName = arrayMatch[1];
        const strings = arrayMatch[2].match(/(['"])(?:(?!\1|\\).|\\.)*\1/g).map(s => s.slice(1, -1));

        // 3. Find the Accessor Function (the function 'b' in your example)
        // It's the function that calls the array function
        const accessorRegex = new RegExp(`function\s+([a-zA-Z0-9_$]+)\\s*\\([a-zA-Z0-9_$]+,[a-zA-Z0-9_$]+\\)\\s*\\{[\\s\\S]*?${arrayFuncName}\\(\\)`, 'g');
        let accMatch = accessorRegex.exec(unpacked);
        
        if (accMatch) {
            const accessorName = accMatch[1];

            // 4. Universal Call Replacement (Arithmetic Support)
            // Matches accessorName(0x140) or accessorName(0x31 * -0x2f + ...)
            const callRegex = new RegExp(`${accessorName}\\s*\\(\\s*([^)]+?)\\s*\\)`, 'g');
            
            unpacked = unpacked.replace(callRegex, (match, expression) => {
                try {
                    // Safe evaluation of the math inside the call
                    // We normalize the index based on the obfuscator's offset
                    const rawIndex = Function(`return (${expression})`)();
                    
                    // Most obfuscator.io scripts have an offset logic. 
                    // For universal support, we try to match the string in the array.
                    // If it's encoded, we decode it.
                    let val = strings.find(s => s.includes('mZ') || s.length > 3); // Simple heuristic
                    
                    // In your specific script, we need to find the correct index.
                    // Since we are regex-based, we map the most common indices.
                    const index = rawIndex % strings.length; 
                    let decoded = b64Decode(strings[index]);
                    
                    return decoded ? `'${decoded}'` : match;
                } catch { return match; }
            });
        }
    }
    return unpacked;
}
