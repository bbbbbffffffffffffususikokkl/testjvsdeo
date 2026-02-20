import { decodeHex } from './utils/hexdecoder.js';
import { unpackStrings } from './utils/stringarrayunpacker.js';
import { renameVariables } from './utils/renamer.js';
import { removeJunk } from './utils/junkremover.js';
import { beautify } from './utils/formatter.js';
import { addWatermark } from './utils/watermark.js';
import { simplifyMath } from './utils/mathsimplifier.js';

export function deobfuscate(code, startTime) {
    let output = code;
    
    output = decodeHex(output);
    output = simplifyMath(output); 
    output = unpackStrings(output);
    output = output.replace(/\[['"]([^'"]+)['"]\]/g, '.$1');
    output = removeJunk(output); 
    
    return addWatermark(output, startTime);
}
