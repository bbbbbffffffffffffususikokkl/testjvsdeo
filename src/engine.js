import { decodeHex } from './utils/hexdecoder.js';
import { unpackStrings } from './utils/stringarrayunpacker.js';
import { renameVariables } from './utils/renamer.js';
import { removeJunk } from './utils/junkremover.js';
import { beautify } from './utils/formatter.js';
import { addWatermark } from './utils/watermark.js';
import { simplifyMath } from './utils/mathsimplifier.js';
import { refineDecals } from './utils/refinedecals.js';

export function deobfuscate(code, settings, startTime) {
    let output = code;

    try {
        if (settings.decodeHex) {
            output = decodeHex(output);
        }
        output = simplifyMath(output); 
        if (settings.decodeHex) {
            output = decodeHex(output);
        }
        output = unpackStrings(output);
        if (settings.renameStrings) {
            output = renameVariables(output);
        }
        output = output.replace(/([a-zA-Z0-9_$]+)\[['"]([^'"]+)['"]\]/g, '$1.$2');
        if (settings.deadCode) {
            output = removeJunk(output);
        }
        if (settings.refineDecals) {
            output = refineDecals(output);
        }
        output = beautify(output);
        output = addWatermark(output, startTime);
    } catch (e) {
        output = `// Deobfuscator Error: ${e.message}\n` + output;
    }

    return output;
}
