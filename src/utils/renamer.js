export function renameVariables(code) {
    let renamed = code;

    // 1. Identify Minecraft Import Aliases
    // Target: import { world as _0x55d1 } from ...
    const importAliasRegex = /import\s*\{([\s\S]*?)\}\s*from/g;
    let match;
    const aliasMap = {};

    while ((match = importAliasRegex.exec(renamed)) !== null) {
        const importContent = match[1];
        // Find patterns like "world as _0x123"
        const aliasMatches = importContent.matchAll(/(\w+)\s+as\s+([a-zA-Z0-9_$]+)/g);
        for (const aliasMatch of aliasMatches) {
            const [full, realName, alias] = aliasMatch;
            aliasMap[alias] = realName;
        }
    }

    // 2. Identify Event Aliases
    // If we see: const _0x123 = event.sender;
    const eventAliasRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*([a-zA-Z0-9_$]+)\.sender/g;
    let eventMatch;
    while ((eventMatch = eventAliasRegex.exec(renamed)) !== null) {
        aliasMap[eventMatch[1]] = "player";
    }

    // 3. Apply the Map globally
    // We sort keys by length (longest first) so _0x1234 doesn't partially rename _0x123
    const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);

    sortedAliases.forEach(alias => {
        const regex = new RegExp(`\\b${alias}\\b`, 'g');
        renamed = renamed.replace(regex, aliasMap[alias]);
    });

    // 4. Clean up the import statements (remove the "as _0x123" part)
    renamed = renamed.replace(/(\w+)\s+as\s+\w+/g, '$1');

    return renamed;
}
