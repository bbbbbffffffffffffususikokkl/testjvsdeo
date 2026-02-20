import * as t from '@babel/types';
import { ConstantVariable } from './variable';
import { copyExpression } from './misc';
import traverse, { NodePath } from '@babel/traverse';

export type ProxyFunctionExpression =
    | (t.FunctionExpression & { params: t.Identifier[] })
    | (t.FunctionDeclaration & { params: t.Identifier[] })
    | (t.ObjectMethod & { params: t.Identifier[] });

type Argument = t.CallExpression['arguments'][number];

/**
 * Returns whether a node is a proxy function expression — a function whose
 * body is a single return statement (or an arrow expression body).
 */
export const isProxyFunctionExpression = (node: t.Node): node is ProxyFunctionExpression => {
    if (
        (t.isFunctionExpression(node) ||
            t.isFunctionDeclaration(node) ||
            t.isObjectMethod(node)) &&
        node.params.every(p => t.isIdentifier(p))
    ) {
        if (t.isExpression(node.body)) {
            return true;
        }
        if (
            t.isBlockStatement(node.body) &&
            node.body.body.length == 1 &&
            t.isReturnStatement(node.body.body[0])
        ) {
            return true;
        }
    }
    return false;
};

/**
 * Represents a proxy function that simply wraps another expression or call,
 * e.g.: `function(a, b) { return a + b; }`.
 */
export class ProxyFunction {
    protected readonly expression: ProxyFunctionExpression;

    constructor(expression: ProxyFunctionExpression) {
        this.expression = expression;
    }

    /**
     * Returns the replacement expression for a call of this proxy function.
     * @param args The call arguments.
     */
    public getReplacement(args: Argument[]): t.Expression {
        let expression: t.Expression;
        if (t.isExpression(this.expression.body)) {
            expression = copyExpression(this.expression.body);
        } else {
            const stmt = this.expression.body.body[0];
            const returnArg = t.isReturnStatement(stmt) && stmt.argument ? stmt.argument : null;
            expression = returnArg ? copyExpression(returnArg) : t.identifier('undefined');
        }
        this.replaceParameters(expression, args);
        return expression;
    }

    /**
     * Substitutes parameter identifiers in `expression` with the concrete
     * call arguments.
     */
    private replaceParameters(expression: t.Expression, args: Argument[]): void {
        const paramMap = new Map<string, t.Node>(
            this.expression.params.map((param: t.Identifier, index: number) => [
                param.name,
                args[index] || t.identifier('undefined')
            ])
        );
        const pathsToReplace: [NodePath, t.Expression][] = [];

        traverse(expression, {
            enter(path) {
                if (
                    t.isIdentifier(path.node) &&
                    !(
                        path.parentPath &&
                        path.parentPath.isMemberExpression() &&
                        path.key == 'property'
                    ) &&
                    paramMap.has(path.node.name)
                ) {
                    const replacement = paramMap.get(path.node.name) as t.Expression;
                    pathsToReplace.push([path, replacement]);
                }
            },
            noScope: true
        });

        for (const [path, replacement] of pathsToReplace) {
            path.replaceWith(replacement);
        }
    }
}

/**
 * A proxy function that is bound to a named variable binding, allowing its
 * call sites to be located and replaced.
 */
export class ProxyFunctionVariable extends ProxyFunction {
    private readonly variable: ConstantVariable<ProxyFunctionExpression>;

    constructor(variable: ConstantVariable<ProxyFunctionExpression>) {
        super(variable.expression);
        this.variable = variable;
    }

    /** Returns all call-site paths for this proxy function. */
    public getCalls(): NodePath[] {
        return this.variable.binding.referencePaths;
    }

    /**
     * Attempts to replace a single call site.
     * @returns Whether the replacement was made.
     */
    public replaceCall(path: NodePath): boolean {
        if (path.parentPath && path.parentPath.isCallExpression() && path.key == 'callee') {
            const expression = this.getReplacement(path.parentPath.node.arguments);
            path.parentPath.replaceWith(expression);
            return true;
        }
        return false;
    }
}
