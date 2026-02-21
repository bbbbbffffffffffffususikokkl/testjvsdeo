export function renameVariables(code) {
    let renamed = code;

    const importAliasRegex = /import\s*\{([\s\S]*?)\}\s*from/g;
    let match;
    const aliasMap = {};

    while ((match = importAliasRegex.exec(renamed)) !== null) {
        const importContent = match[1];
        const aliasMatches = importContent.matchAll(/(\w+)\s+as\s+([a-zA-Z0-9_$]+)/g);
        for (const aliasMatch of aliasMatches) {
            const [full, realName, alias] = aliasMatch;
            aliasMap[alias] = realName;
        }
    }

    const eventAliasRegex = /const\s+([a-zA-Z0-9_$]+)\s*=\s*([a-zA-Z0-9_$]+)\.sender/g;
    let eventMatch;
    while ((eventMatch = eventAliasRegex.exec(renamed)) !== null) {
        aliasMap[eventMatch[1]] = "player";
    }

    const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);

    sortedAliases.forEach(alias => {
        const regex = new RegExp(`\\b${alias}\\b`, 'g');
        renamed = renamed.replace(regex, aliasMap[alias]);
    });
    renamed = renamed.replace(/(\w+)\s+as\s+\w+/g, '$1');

    return renamed;
}
