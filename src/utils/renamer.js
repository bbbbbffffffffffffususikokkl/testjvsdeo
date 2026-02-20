export function renameVariables(code) {
    let renamed = code;

    // MCBE Common Mapping
    const mappings = {
        "_0x[a-f0-9]+": "var_", // Generic fix
        "(@minecraft/server)": "'@minecraft/server'",
    };

    // Auto-detect MCBE variables based on imports
    // Example: import { world as _0x1 } -> world
    const importMatch = renamed.match(/import\s*\{([\s\S]*?)\}\s*from/);
    if (importMatch) {
        // This is a simplified logic to catch "world as _0x..."
        renamed = renamed.replace(/(\w+)\s+as\s+(_0x[a-f0-9]+)/g, (m, realName, alias) => {
            // Replace all occurrences of the alias with the real name
            const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, 'g');
            renamed = renamed.replace(aliasRegex, realName);
            return realName; 
        });
    }

    return renamed;
}
