import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { LogFunction, Transformation, TransformationProperties } from './transformation';

/**
 * Removes dead branches from if-statements and conditional expressions whose
 * test is a literal value (or an array/object expression, which is always truthy).
 */
export class DeadBranchRemover extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'deadBranchRemoval',
        rebuildScopeTree: true
    };

    /**
     * Executes the transformation.
     * @param log The log function.
     */
    public execute(log: LogFunction): boolean {
        const self = this;

        traverse(this.ast, {
            IfStatement(path) {
                if (self.isSemiLiteral(path.node.test)) {
                    if (self.isTruthy(path.node.test)) {
                        const statements = t.isBlockStatement(path.node.consequent)
                            ? path.node.consequent.body
                            : [path.node.consequent];
                        path.replaceWithMultiple(statements);
                        self.setChanged();
                    } else {
                        if (path.node.alternate) {
                            if (t.isBlockStatement(path.node.alternate)) {
                                path.replaceWithMultiple(path.node.alternate.body);
                            } else {
                                path.replaceWith(path.node.alternate);
                            }
                        } else {
                            path.remove();
                        }
                        self.setChanged();
                    }
                }
            },
            ConditionalExpression(path) {
                // Simplify (true ? a : b) → a  /  (false ? a : b) → b
                if (self.isSemiLiteral(path.node.test)) {
                    const replacement = self.isTruthy(path.node.test)
                        ? path.node.consequent
                        : path.node.alternate;
                    path.replaceWith(replacement);
                    self.setChanged();
                }
                // Simplify (expr ? true : false) → !!expr  /  (expr ? false : true) → !expr
                else if (
                    t.isBooleanLiteral(path.node.consequent) &&
                    t.isBooleanLiteral(path.node.alternate)
                ) {
                    const consequent = path.node.consequent.value;
                    const alternate = path.node.alternate.value;
                    let replacement: t.Node;

                    if (consequent && !alternate) {
                        replacement = t.unaryExpression('!', t.unaryExpression('!', path.node.test));
                    } else if (!consequent && alternate) {
                        replacement = t.unaryExpression('!', path.node.test);
                    } else if (consequent && alternate) {
                        replacement = t.sequenceExpression([path.node.test, t.booleanLiteral(true)]);
                    } else {
                        replacement = t.sequenceExpression([path.node.test, t.booleanLiteral(false)]);
                    }

                    path.replaceWith(replacement);
                    self.setChanged();
                }
            }
        });

        return this.hasChanged();
    }

    private isSemiLiteral(
        node: t.Node
    ): node is t.Literal | t.ArrayExpression | t.ObjectExpression {
        return t.isLiteral(node) || t.isArrayExpression(node) || t.isObjectExpression(node);
    }

    private isTruthy(literal: t.Literal | t.ArrayExpression | t.ObjectExpression): boolean {
        return t.isBooleanLiteral(literal) ||
            t.isNumericLiteral(literal) ||
            t.isStringLiteral(literal)
            ? !!literal.value
            : true;
    }
}
