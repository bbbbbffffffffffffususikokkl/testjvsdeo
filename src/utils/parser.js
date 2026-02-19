import { renameVariables } from './renamer.js';
import { removeJunk } from './junkremover.js';

export function deobfuscate(code) {
  let output = code;
  
  output = renameVariables(output);
  output = removeJunk(output);
  
  return output;
}
