import { renameVariables } from './utils/renamer.js';
import { removeJunk } from './utils/junkremover.js';
import { addWatermark } from './utils/watermark.js';

export function deobfuscate(code, startTime) {
    let output = code;

    output = removeJunk(output);
    output = renameVariables(output);
    output = addWatermark(output, startTime);

    return output;
}
