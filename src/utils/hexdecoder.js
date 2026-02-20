export function decodeHex(code) {
    // Handles \xHH (Hex) and \uHHHH (Unicode)
    return code.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    }).replace(/\\u([0-9a-fA-F]{4})/g, (match, unit) => {
        return String.fromCharCode(parseInt(unit, 16));
    });
}
