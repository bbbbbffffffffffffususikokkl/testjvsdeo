import { decodeHex } from './utils/hexdecoder.js';
import { unpackStrings } from './utils/stringarrayunpacker.js';
import { renameVariables } from './utils/renamer.js';
import { removeJunk } from './utils/junkremover.js';
import { beautify } from './utils/formatter.js';
import { addWatermark } from './utils/watermark.js';

export function deobfuscate(code, startTime) {
    let output = code;

    try {
        output = decodeHex(output);
        output = unpackStrings(output);
        
        // This is where the magic happens:
        // Turns _0x55d1 -> world, _0x8821 -> player, etc.
        output = renameVariables(output); 

        output = removeJunk(output);
        
        // Member Expression Fixer (Clean up those brackets)
        output = output.replace(/\[['"]([^'"]+)['"]\]/g, '.$1'); 

        output = beautify(output);
        output = addWatermark(output, startTime);

    } catch (e) {
        output = `// Deobfuscation Error: ${e.message}\n` + output;
    }

    return output;
}
