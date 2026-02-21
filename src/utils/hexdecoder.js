// src/utils/hexdecoder.js
function isPrintable(str) {
    return /^[\x09\x0A\x0D\x20-\x7E]*$/.test(str);
}

function decodeHexEscapes(code) {
    return code
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
            String.fromCharCode(parseInt(h, 16))
        )
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
            String.fromCharCode(parseInt(h, 16))
        );
}

function decodeHexStringLiteral(str) {
    if (!/^[0-9a-fA-F]+$/.test(str) || str.length % 2 !== 0) return null;
    const out = str.match(/../g).map(b =>
        String.fromCharCode(parseInt(b, 16))
    ).join('');
    return isPrintable(out) ? out : null;
}

function tryBase64(str) {
    try {
        const out = atob(str);
        return isPrintable(out) ? out : null;
    } catch {
        return null;
    }
}

function tryBase32(str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    if (![...str].every(c => alphabet.includes(c))) return null;

    let bits = "";
    for (const c of str) {
        bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
    }

    let out = "";
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        out += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
    }

    return isPrintable(out) ? out : null;
}

export function decodeHex(code) {
    code = decodeHexEscapes(code);

    // decode string literals only
    return code.replace(/(['"])(.*?)\1/g, (m, q, body) => {
        let decoded =
            decodeHexStringLiteral(body) ??
            tryBase64(body) ??
            tryBase32(body);

        return decoded ? `${q}${decoded}${q}` : m;
    });
}