export function simplifyMath(code) {
    // Finds patterns like (0x31 * -0x2f + 0x4) and replaces them with the result
    return code.replace(/\((0x[0-9a-fA-F]+|(?:\s*[-+*/]\s*|0x[0-9a-fA-F]+|\d+)+)\)/g, (match, expr) => {
        try {
            // Only simplify if it looks like math, not a function call
            if (!expr.includes('0x')) return match;
            const result = Function(`return (${expr})`)();
            return !isNaN(result) ? result.toString() : match;
        } catch { return match; }
    });
}
