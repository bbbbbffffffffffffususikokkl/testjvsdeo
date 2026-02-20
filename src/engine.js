import { decodeHex } from './utils/hexdecoder.js';
import { removeJunk } from './utils/junkremover.js';
import { unpackStrings } from './utils/stringarrayunpacker.js'; // NEW
import { fixMemberExpressions } from "./utils/memberexpressionfixer.js"
import { renameVariables } from './utils/renamer.js';
import { addWatermark } from './utils/watermark.js';

export function deobfuscate(code, startTime) {
    let output = code;

    try {
        output = decodeHex(output);
        output = unpackStrings(output); // Run this now!
        output = fixMemberExpressions(output);
        output = removeJunk(output);
        output = renameVariables(output);
        output = addWatermark(output, startTime);
    } catch (e) {
        output = `// Deobfuscation Error: ${e.message}\n\n` + output;
    }

    return output;
}
