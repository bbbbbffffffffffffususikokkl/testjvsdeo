import { decodeHex } from './utils/hexdecoder.js';
import { unpackStrings } from './utils/stringarrayunpacker.js';
import { renameVariables } from './utils/renamer.js';
import { removeJunk } from './utils/junkremover.js';
import { beautify } from './utils/formatter.js';
import { addWatermark } from './utils/watermark.js';
import { simplifyMath } from './utils/mathsimplifier.js';
import { refineDecals } from './utils/refinedecals.js';

export function deobfuscate(code, startTime) {
    let output = code;

    try {
        // 1. Basic cleaning: Hex -> String
        output = decodeHex(output);

        // 2. Resolve math (Obfuscator.io parseInt/arithmetic support)
        // MUST happen before unpacking so indices are numbers
        output = simplifyMath(output); 

        // 3. String Array Unpacking (The ben-sb / simulator logic)
        output = unpackStrings(output);

        // 4. Rename MCBE variables (e.g., _0x55d1 -> world)
        output = renameVariables(output);

        // 5. Member Fixer (console['warn'] -> console.warn)
        output = output.replace(/([a-zA-Z0-9_$]+)\[['"]([^'"]+)['"]\]/g, '$1.$2');

        // 6. Aggressive Junk Removal (Delete unused var/functions)
        output = removeJunk(output);
        output = refineDecals(output);

        // 7. Formatting (Final visual polish)
        output = beautify(output);

        // 8. Add Watermark at the top
        output = addWatermark(output, startTime);

    } catch (e) {
        output = `// Vex Deobfuscator Error: ${e.message}\n` + output;
    }

    return output;
}
