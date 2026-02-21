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
    
    // Counters for generic renaming
    let tableIndex = 1;
    let funcIndex = 1;
    let varIndex = 1;
    let argIndex = 1;
    let classIndex = 1;

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

    /* ========= PASS 1: Identify and Map Patterns ========= */
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        // CASE 1: Imports (import _0xabc from './config.js')
        if (t.value === "import") {
            const nameTok = getNext(i, 1);
            const fromTok = getNext(i, 2);
            const pathTok = getNext(i, 3);

            if (nameTok && fromTok?.token.value === "from" && pathTok?.token.type === "String") {
                const originalName = nameTok.token.value;
                if (isObfuscated(originalName)) {
                    let path = pathTok.token.raw.replace(/['"]/g, '');
                    let fileName = path.split('/').pop().split('.')[0];
                    let cleanName = fileName.replace(/[^a-zA-Z0-9]/g, '');
                    let finalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    
                    if (!finalName) finalName = "Module" + varIndex++;
                    renameMap.set(originalName, finalName);
                }
            }
        }

        // CASE 2: Variable/Table Declarations (var _0xabc = ...)
        if (t.type === "Identifier" && ["var", "let", "const"].includes(t.value)) {
            const nameToken = getNext(i, 1);
            const assignToken = getNext(i, 2);
            const valueToken = getNext(i, 3);

            if (nameToken && assignToken?.token.value === "=") {
                const name = nameToken.token.value;
                if (isObfuscated(name) && !renameMap.has(name)) {
                    if (valueToken?.token.value === "[") {
                        renameMap.set(name, `table${tableIndex++}`);
                    } else {
                        renameMap.set(name, `var${varIndex++}`);
                    }
                }
            }
        }

        // CASE 3: Functions & CASE 4: Arguments
        if (t.value === "function") {
            const nameToken = getNext(i, 1);
            if (nameToken && isIdentifier(nameToken.token)) {
                const name = nameToken.token.value;
                if (isObfuscated(name) && !renameMap.has(name)) {
                    renameMap.set(name, `func${funcIndex++}`);
                }
            }

            let openParen = getNext(i, nameToken ? 2 : 1);
            if (openParen?.token.value === "(") {
                let pIdx = openParen.index;
                let offset = 1;
                while (true) {
                    let p = getNext(pIdx, offset);
                    if (!p || p.token.value === ")") break;
                    if (isIdentifier(p.token) && isObfuscated(p.token.value)) {
                        if (!renameMap.has(p.token.value)) {
                            renameMap.set(p.token.value, `arg${argIndex++}`);
                        }
                    }
                    pIdx = p.index; 
                }
            }
        }

        // CASE 5: Catch Clauses (catch (err))
        if (t.value === "catch") {
            const errVar = getNext(i, 2);
            if (errVar && isObfuscated(errVar.token.value)) {
                renameMap.set(errVar.token.value, "err");
            }
        }

        // CASE 6: Classes
        if (t.value === "class") {
            const className = getNext(i, 1);
            if (className && isObfuscated(className.token.value)) {
                renameMap.set(className.token.value, `Class${classIndex++}`);
            }
        }
    }

    /* ========= PASS 2: Apply Renaming to Usages ========= */
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (!isIdentifier(t) || KEYWORDS.has(t.value)) continue;

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

/* ================= HELPERS ================= */

function tokenize(code) {
    const tokens = [];
    let i = 0;
    while (i < code.length) {
        const c = code[i];
        if (/\s/.test(c)) {
            tokens.push({ type: "Whitespace", raw: c });
            i++; continue;
        }
        if (c === "'" || c === '"') {
            const q = c; let start = i++;
            while (i < code.length) {
                if (code[i] === "\\" && i + 1 < code.length) i += 2;
                else if (code[i] === q) break;
                else i++;
            }
            i++; tokens.push({ type: "String", raw: code.slice(start, i) }); continue;
        }
        if (/[a-zA-Z_$]/.test(c)) {
            let start = i++;
            while (/[a-zA-Z0-9_$]/.test(code[i])) i++;
            const value = code.slice(start, i);
            tokens.push({ type: "Identifier", value, raw: value }); continue;
        }
        tokens.push({ type: "Punctuator", value: c, raw: c }); i++;
    }
    return tokens;
}

function isIdentifier(t) {
    return t && t.type === "Identifier";
}

function isObfuscated(name) {
    return /^_0x[a-f0-9]+$/i.test(name) || name.length <= 2;
}