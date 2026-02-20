import * as t from '@babel/types';
import { NodePath, Binding } from '@babel/traverse';

export interface ConstantVariable<T extends t.Node> {
    name: string;
    expression: T;
    binding: Binding;
    remove(): void;
}

/**
 * A constant variable that is declared via a variable declarator.
 */
export class ConstantDeclarationVariable<T extends t.Node> implements ConstantVariable<T> {
    public readonly name: string;
    public readonly expression: T;
    public readonly binding: Binding;
    private readonly path: NodePath<t.VariableDeclarator>;

    constructor(
        name: string,
        expression: T,
        binding: Binding,
        path: NodePath<t.VariableDeclarator>
    ) {
        this.name = name;
        this.expression = expression;
        this.binding = binding;
        this.path = path;
    }

    public remove(): void {
        const parent = this.path.parentPath;
        if (parent && t.isVariableDeclaration(parent.node) && parent.node.declarations.length == 1) {
            parent.remove();
        } else {
            this.path.remove();
        }
    }
}

/**
 * A constant variable that is declared via an assignment expression (e.g.
 * function parameter that is immediately assigned).
 */
export class ConstantAssignmentVariable<T extends t.Node> implements ConstantVariable<T> {
    public readonly name: string;
    public readonly expression: T;
    public readonly binding: Binding;
    private readonly path: NodePath;

    constructor(name: string, expression: T, binding: Binding, path: NodePath) {
        this.name = name;
        this.expression = expression;
        this.binding = binding;
        this.path = path;
    }

    public remove(): void {
        const parent = this.path.parentPath;
        if (parent && t.isVariableDeclaration(parent.node) && parent.node.declarations.length == 1) {
            parent.remove();
        } else {
            this.path.remove();
        }
    }
}

/**
 * Finds a constant variable at the given path whose initialiser matches the
 * provided type guard.
 *
 * @param path          The current traversal path.
 * @param isExpression  Type guard for the expression type we are looking for.
 * @param isFunctionDeclaration  When true, also match function declarations.
 */
export function findConstantVariable<T extends t.Node>(
    path: NodePath,
    isExpression: (node: t.Node) => node is T,
    isFunctionDeclaration = false
): ConstantVariable<T> | undefined {
    // ── Function declaration ─────────────────────────────────────────────────
    if (
        isFunctionDeclaration &&
        path.isFunctionDeclaration() &&
        path.node.id
    ) {
        const name = path.node.id.name;
        const binding = path.scope.getBinding(name);
        if (!binding || !binding.constant) {
            return undefined;
        }
        if (!isExpression(path.node)) {
            return undefined;
        }
        return new ConstantDeclarationVariable(
            name,
            path.node as unknown as T,
            binding,
            path as unknown as NodePath<t.VariableDeclarator>
        );
    }

    // ── Variable declarator ──────────────────────────────────────────────────
    if (!path.isVariableDeclarator()) {
        return undefined;
    }

    const declarator = path.node;
    if (!t.isIdentifier(declarator.id) || declarator.init == undefined) {
        return undefined;
    }

    if (!isExpression(declarator.init)) {
        return undefined;
    }

    const name = declarator.id.name;
    const binding = path.scope.getBinding(name);
    if (!binding) {
        return undefined;
    }

    // Constant declarations
    if (binding.constant) {
        return new ConstantDeclarationVariable(
            name,
            declarator.init as T,
            binding,
            path as NodePath<t.VariableDeclarator>
        );
    }

    // Single-assignment (constant violation is only the initial declarator)
    if (
        binding.constantViolations.length == 1 &&
        binding.constantViolations[0].node == declarator
    ) {
        return new ConstantDeclarationVariable(
            name,
            declarator.init as T,
            binding,
            path as NodePath<t.VariableDeclarator>
        );
    }

    return undefined;
}
