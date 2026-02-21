// src/utils/renamer.js
import { renameVariablesAST } from "./AST/renamerAST.js";

export function renameVariables(code) {
    return renameVariablesAST(code);
}