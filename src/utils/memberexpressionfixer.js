// src/utils/memberexpressionfixer.js
export function fixMemberExpressions(code) {
    // Converts object['property'] to object.property
    return code.replace(/([a-zA-Z0-9_$]+)\[['"]([a-zA-Z_$][a-zA-Z0-9_$]*)['"]\]/g, '$1.$2');
}
