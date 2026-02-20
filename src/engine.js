import { decodeHex } from './utils/hexdecoder.js';
import { removeJunk } from './utils/junkremover.js';
import { renameVariables } from './utils/renamer.js';
import { addWatermark } from './utils/watermark.js';

export function deobfuscate(code, startTime) {
    let output = code;

    try {
        // 1. Decode Hex (Crucial for MCBE imports)
        output = decodeHex(output);

        // 2. Remove Junk (Prevents logic bloat)
        output = removeJunk(output);

        // 3. Rename (Fixes the _0x names)
        output = renameVariables(output);

        // 4. Add Vex Watermark
        output = addWatermark(output, startTime);

    } catch (e) {
        output = `// Deobfuscation Error: ${e.message}\n\n` + output;
    }

    return output;
}
