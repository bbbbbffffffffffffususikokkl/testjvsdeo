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
        output = decodeHex(output);
        output = simplifyMath(output); 
        output = decodeHex(output);
        output = unpackStrings(output);
        output = renameVariables(output);
        output = output.replace(/([a-zA-Z0-9_$]+)\[['"]([^'"]+)['"]\]/g, '$1.$2');
        output = removeJunk(output);
        output = refineDecals(output);
        output = beautify(output);
        output = addWatermark(output, startTime);
    } catch (e) {
        output = `// Deobfuscator Error: ${e.message}\n` + output;
    }

    return output;
}
