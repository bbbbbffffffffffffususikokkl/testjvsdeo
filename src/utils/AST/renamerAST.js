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
    let varIndex = 1;

    /* ========= PASS 1: declarations ========= */

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        // var _0x123 = [...]
        if (isDecl(tokens, i) && tokens[i+3]?.value === "[") {
            const name = tokens[i+1].value;
            if (isObfuscated(name)) {
                renameMap.set(name, `table${tableIndex++}`);
            }
        }

        // function _0xabc() {}
        if (t.value === "function" && isIdentifier(tokens[i+1])) {
            const name = tokens[i+1].value;
            if (isObfuscated(name)) {
                renameMap.set(name, `func${funcIndex++}`);
            }
        }

        // import { world as _0x123 }
        if (t.value === "as" && isIdentifier(tokens[i+1]) && isIdentifier(tokens[i-1])) {
            renameMap.set(tokens[i+1].value, tokens[i-1].value);
        }

        // const _0x123 = event.sender
        if (
            isDecl(tokens, i) &&
            tokens[i+3]?.value === "event" &&
            tokens[i+4]?.value === "." &&
            tokens[i+5]?.value === "sender"
        ) {
            renameMap.set(tokens[i+1].value, "player");
        }
    }

    /* ========= PASS 2: rename usages ========= */

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (!isIdentifier(t)) continue;
        if (KEYWORDS.has(t.value)) continue;

        // skip property names: obj.property
        if (tokens[i-1]?.value === ".") continue;

        const renamed = renameMap.get(t.value);
        if (renamed) {
            t.value = renamed;
            t.raw = renamed; // 🔥 CRITICAL FIX
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