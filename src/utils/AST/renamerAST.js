// src/utils/AST/renamerAST.js
const KEYWORDS = new Set([
    "var","let","const","function","return","if","else","for","while",
    "switch","case","break","continue","import","from","as","new","try",
    "catch","finally","throw","typeof","instanceof","void","delete",
    "class","extends","super","this"
]);

export function renameVariablesAST(code) {
    const tokens = tokenize(code);
    const renameMap = new Map();
    let tableIndex = 1;
    let funcIndex = 1;

    // Helper to find tokens skipping whitespace
    const getNext = (currentIndex, step = 1) => {
        let found = 0;
        for (let i = currentIndex + 1; i < tokens.length; i++) {
            if (tokens[i].type !== "Whitespace") {
                found++;
                if (found === step) return { token: tokens[i], index: i };
            }
        }
        return null;
    };

    /* ========= PASS 1: declarations ========= */
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        // Handle Variable Declarations (var _0xabc = [...])
        if (t.type === "Identifier" && ["var", "let", "const"].includes(t.value)) {
            const nameToken = getNext(i, 1);
            const assignToken = getNext(i, 2);
            const valueToken = getNext(i, 3);

            if (nameToken && assignToken?.token.value === "=") {
                const name = nameToken.token.value;
                if (isObfuscated(name)) {
                    // Check if it's a table (array)
                    if (valueToken?.token.value === "[") {
                        renameMap.set(name, `table${tableIndex++}`);
                    } else {
                        // Default variable name if needed
                        renameMap.set(name, `var${varIndex++}`);
                    }
                }
            }
        }

        // Handle Function Declarations (function _0xabc() {})
        if (t.value === "function") {
            const nameToken = getNext(i, 1);
            if (nameToken && isIdentifier(nameToken.token)) {
                const name = nameToken.token.value;
                if (isObfuscated(name)) {
                    renameMap.set(name, `func${funcIndex++}`);
                }
            }
        }
    }

    /* ========= PASS 2: rename usages ========= */
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (!isIdentifier(t) || KEYWORDS.has(t.value)) continue;

        // Skip properties like obj._0xabc
        let prev = null;
        for (let j = i - 1; j >= 0; j--) {
            if (tokens[j].type !== "Whitespace") {
                prev = tokens[j];
                break;
            }
        }
        if (prev?.value === ".") continue;

        const renamed = renameMap.get(t.value);
        if (renamed) {
            t.value = renamed;
            t.raw = renamed;
        }
    }

    return tokens.map(t => t.raw).join('');
}

/* ================= helpers ================= */

function tokenize(code) {
    const tokens = [];
    let i = 0;

    while (i < code.length) {
        const c = code[i];

        if (/\s/.test(c)) {
            tokens.push({ type: "Whitespace", raw: c });
            i++;
            continue;
        }

        if (c === "'" || c === '"') {
            const q = c;
            let start = i++;
            while (i < code.length) {
                if (code[i] === "\\" && i + 1 < code.length) i += 2;
                else if (code[i] === q) break;
                else i++;
            }
            i++;
            tokens.push({ type: "String", raw: code.slice(start, i) });
            continue;
        }

        if (/[a-zA-Z_$]/.test(c)) {
            let start = i++;
            while (/[a-zA-Z0-9_$]/.test(code[i])) i++;
            const value = code.slice(start, i);
            tokens.push({
                type: "Identifier",
                value,
                raw: value
            });
            continue;
        }

        tokens.push({
            type: "Punctuator",
            value: c,
            raw: c
        });
        i++;
    }

    return tokens;
}

function isIdentifier(t) {
    return t && t.type === "Identifier";
}

function isDecl(tokens, i) {
    return (
        tokens[i]?.type === "Identifier" &&
        ["var","let","const"].includes(tokens[i].value) &&
        isIdentifier(tokens[i+1]) &&
        tokens[i+2]?.value === "="
    );
}

function isObfuscated(name) {
    return /^_0x[a-f0-9]+$/i.test(name) || name.length <= 2;
}