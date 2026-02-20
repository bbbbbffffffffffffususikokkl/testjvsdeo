/**
 * engine.ts
 *
 * Public API for the deobfuscator.
 * Parses the source into a Babel AST, runs all enabled transformations,
 * and returns the regenerated source code.
 */

import { parse } from '@babel/parser';
import { Deobfuscator } from './deobfuscator/deobfuscator';
import { Config, defaultConfig } from './deobfuscator/config';

export { Config, defaultConfig };

/**
 * Deobfuscates a JavaScript program that was obfuscated by obfuscator.io.
 *
 * @param source  The obfuscated source code string.
 * @param config  Optional transformation config (defaults to all transforms enabled).
 * @returns       The deobfuscated source code string.
 */
export function deobfuscate(source: string, config: Config = defaultConfig): string {
    const ast = parse(source, { sourceType: 'unambiguous' });
    const deobfuscator = new Deobfuscator(ast, config);
    return deobfuscator.execute();
}
