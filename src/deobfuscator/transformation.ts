import * as t from '@babel/types';
import { TransformationKey } from './config';

export abstract class Transformation {
    protected readonly ast: t.File;
    private changed: boolean = false;

    /**
     * Creates a new transformation.
     * @param ast    The Babel AST.
     * @param config The transformation-specific config.
     */
    constructor(ast: t.File, config: TransformationConfig) {
        this.ast = ast;
    }

    /**
     * Executes the transformation.
     * @param log A logging function prefixed with the transformation name.
     * @returns    Whether the AST was modified.
     */
    public abstract execute(log: LogFunction): boolean;

    /** Returns whether the AST has been modified during this execution. */
    protected hasChanged(): boolean {
        return this.changed;
    }

    /** Marks the AST as modified. */
    protected setChanged(): void {
        this.changed = true;
    }
}

export type LogFunction = (...args: string[]) => void;

export interface TransformationConfig {
    isEnabled: boolean;
    [key: string]: boolean | undefined;
}

/** Static metadata every transformation class must expose. */
export interface TransformationProperties {
    key: TransformationKey;
    /** When true, the Babel scope tree is rebuilt after this transformation runs. */
    rebuildScopeTree?: boolean;
}

/** Constructor + static properties interface for transformation classes. */
export interface TransformationType {
    new (ast: t.File, config: TransformationConfig): Transformation;
    properties: TransformationProperties;
}
