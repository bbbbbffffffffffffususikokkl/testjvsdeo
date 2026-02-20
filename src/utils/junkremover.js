export function removeJunk(code) {
    let cleaned = code;
    // Remove debugger statements
    cleaned = cleaned.replace(/\bdebugger\b;?/g, "");
    // Remove console.logs that are often used for anti-tamper
    cleaned = cleaned.replace(/console\.(log|debug|info)\(.*?\);?/g, "");
    // Remove multi-line and single-line comments (optional, keeps it clean)
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
    return cleaned.trim();
}
