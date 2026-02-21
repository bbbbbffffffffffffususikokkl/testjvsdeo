// src/utils/stringarrayunpacker.js

export function unpackStrings(code) {
    let output = code;

    // 1. Extract string array
    const arrayMatch = output.match(
        /(?:var|const|let)\s+(_0x[a-f0-9]+)\s*=\s*\[(.*?)\];/s
    );
    if (!arrayMatch) return output;

    const arrayName = arrayMatch[1];
    const strings = [...arrayMatch[2].matchAll(/(['"])(.*?)\1/g)]
        .map(m => m[2]);

    // 2. Detect accessor
    const accessorMatch = output.match(
        new RegExp(`function\\s+(_0x[a-f0-9]+)\\s*\$begin:math:text$\\\\w+\\$end:math:text$\\s*\\{([\\s\\S]*?)\\}`)
    );
    if (!accessorMatch) return output;

    const accessorName = accessorMatch[1];
    const body = accessorMatch[2];

    // detect index offset
    let offset = 0;
    const offsetMatch = body.match(/-=\\s*(0x[0-9a-fA-F]+|\\d+)/);
    if (offsetMatch) offset = parseInt(offsetMatch[1]);

    // 3. Replace calls
    const callRegex = new RegExp(`${accessorName}\$begin:math:text$(0x[0-9a-fA-F]+|\\\\d+)\\$end:math:text$`, 'g');
    output = output.replace(callRegex, (_, idx) => {
        const i = parseInt(idx) - offset;
        const val = strings[i];
        return val !== undefined ? `'${val}'` : _;
    });

    // 4. Remove obfuscation blocks
    output = output
        .replace(arrayMatch[0], '')
        .replace(accessorMatch[0], '');

    return output;
}