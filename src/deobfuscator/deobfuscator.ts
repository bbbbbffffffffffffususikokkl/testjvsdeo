import generate from '@babel/generator';
import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { TransformationType } from './transformation';
import { Config, defaultConfig } from './config';
import { ObjectSimplifier } from './objectSimplifier';
import { ProxyFunctionInliner } from './proxyFunctionInliner';
import { UnusedVariableRemover } from './unusedVariableRemover';
import { ConstantPropgator } from './constantPropagator';
import { ReassignmentRemover } from './reassignmentRemover';
import { StringRevealer } from './stringRevealer';
import { DeadBranchRemover } from './deadBranchRemover';
import { SequenceSplitter } from './sequenceSplitter';
import { PropertySimplifier } from './propertySimplifier';
import { ExpressionSimplifier } from './expressionSimplifier';
import { ControlFlowRecoverer } from './controlFlowRecoverer';
import { ObjectPacker } from './objectPacker';
import { AntiTamperRemover } from './antiTamperRemover';

export class Deobfuscator {
    private readonly ast: t.File;
    private readonly config: Config;
    private readonly transformationTypes: TransformationType[] = [
        UnusedVariableRemover,
        ConstantPropgator,
        ReassignmentRemover,
        DeadBranchRemover,
        ObjectPacker,
        ProxyFunctionInliner,
        ExpressionSimplifier,
        SequenceSplitter,
        ControlFlowRecoverer,
        PropertySimplifier,
        AntiTamperRemover,
        ObjectSimplifier,
        StringRevealer
    ];
    private static readonly MAX_ITERATIONS = 50;

    /**
     * Creates a new deobfuscator.
     * @param ast    The Babel AST (t.File).
     * @param config The deobfuscator configuration.
     */
    constructor(ast: t.File, config: Config = defaultConfig) {
        this.ast = ast;
        this.config = config;
    }

    /**
     * Runs all enabled transformations iteratively until no further changes
     * are made (or the maximum iteration count is reached).
     * @returns The regenerated, deobfuscated source code.
     */
    public execute(): string {
        const types = this.transformationTypes.filter(
            t => this.config[t.properties.key].isEnabled
        );
        let i = 0;

        while (i < Deobfuscator.MAX_ITERATIONS) {
            let isModified = false;

            if (!this.config.silent) {
                console.log(`\n[${new Date().toISOString()}]: Starting pass ${i + 1}`);
            }

            for (const type of types) {
                const transformationConfig = this.config[type.properties.key];
                const transformation = new type(this.ast, transformationConfig);

                if (!this.config.silent) {
                    console.log(
                        `[${new Date().toISOString()}]: Executing ${transformation.constructor.name}`
                    );
                }

                let modified = false;
                try {
                    modified = transformation.execute(
                        console.log.bind(console, `[${transformation.constructor.name}]:`)
                    );
                } catch (err) {
                    console.error(err);
                }

                if (modified) {
                    isModified = true;
                }

                if (!this.config.silent) {
                    console.log(
                        `[${new Date().toISOString()}]: Executed ${transformation.constructor.name}, modified ${modified}`
                    );
                }

                if (type.properties.rebuildScopeTree) {
                    this.clearCache();
                }
            }

            i++;
            if (!isModified) {
                break;
            }
        }

        return generate(this.ast, { jsescOption: { minimal: true } }).code;
    }

    /**
     * Clears the Babel traversal cache so that scope information is rebuilt
     * on the next traversal pass.
     */
    private clearCache(): void {
        (traverse as any).cache.clear();
    }
}
