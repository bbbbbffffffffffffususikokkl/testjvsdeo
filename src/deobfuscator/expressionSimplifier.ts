import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { LogFunction, Transformation, TransformationProperties } from './transformation';
import { isNegativeNumericLiteral } from './expression';

/**
 * Simplifies constant binary and unary expressions to their computed values.
 * For example: `0x1 + 0x2` → `3`, `!false` → `true`, `-0x1` → `-1`.
 */
export class ExpressionSimplifier extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'expressionSimplification'
    };

    /**
     * Executes the transformation.
     * @param log The log function.
     */
    public execute(log: LogFunction): boolean {
        const self = this;

        traverse(this.ast, {
            UnaryExpression(path) {
                const node = path.node;

                // -<number> → NumericLiteral with negative value
                if (node.operator == '-' && t.isNumericLiteral(node.argument)) {
                    path.replaceWith(t.numericLiteral(-node.argument.value));
                    self.setChanged();
                    return;
                }

                // !true → false, !false → true
                if (node.operator == '!' && t.isBooleanLiteral(node.argument)) {
                    path.replaceWith(t.booleanLiteral(!node.argument.value));
                    self.setChanged();
                    return;
                }

                // !0 → true, !1 → false
                if (node.operator == '!' && t.isNumericLiteral(node.argument)) {
                    path.replaceWith(t.booleanLiteral(!node.argument.value));
                    self.setChanged();
                    return;
                }

                // void 0 → undefined
                if (node.operator == 'void' && t.isNumericLiteral(node.argument)) {
                    path.replaceWith(t.identifier('undefined'));
                    self.setChanged();
                    return;
                }
            },

            BinaryExpression(path) {
                const { left, right, operator } = path.node;

                // Both sides are numeric literals
                if (
                    (t.isNumericLiteral(left) || isNegativeNumericLiteral(left)) &&
                    (t.isNumericLiteral(right) || isNegativeNumericLiteral(right))
                ) {
                    const l = t.isNumericLiteral(left) ? left.value : -(left.argument as t.NumericLiteral).value;
                    const r = t.isNumericLiteral(right) ? right.value : -(right.argument as t.NumericLiteral).value;
                    let result: number | boolean | string | undefined;

                    switch (operator) {
                        case '+': result = l + r; break;
                        case '-': result = l - r; break;
                        case '*': result = l * r; break;
                        case '/': result = l / r; break;
                        case '%': result = l % r; break;
                        case '**': result = l ** r; break;
                        case '|': result = l | r; break;
                        case '&': result = l & r; break;
                        case '^': result = l ^ r; break;
                        case '<<': result = l << r; break;
                        case '>>': result = l >> r; break;
                        case '>>>': result = l >>> r; break;
                        case '==': result = l == r; break;
                        case '!=': result = l != r; break;
                        case '===': result = l === r; break;
                        case '!==': result = l !== r; break;
                        case '<': result = l < r; break;
                        case '>': result = l > r; break;
                        case '<=': result = l <= r; break;
                        case '>=': result = l >= r; break;
                    }

                    if (result !== undefined) {
                        if (typeof result === 'number') {
                            path.replaceWith(t.numericLiteral(result));
                        } else if (typeof result === 'boolean') {
                            path.replaceWith(t.booleanLiteral(result));
                        }
                        self.setChanged();
                        return;
                    }
                }

                // String concatenation
                if (operator == '+' && t.isStringLiteral(left) && t.isStringLiteral(right)) {
                    path.replaceWith(t.stringLiteral(left.value + right.value));
                    self.setChanged();
                    return;
                }

                // String + number  /  number + string
                if (operator == '+') {
                    const lStr = t.isStringLiteral(left) ? left.value : null;
                    const rStr = t.isStringLiteral(right) ? right.value : null;
                    const lNum = t.isNumericLiteral(left) ? left.value : isNegativeNumericLiteral(left) ? -(left.argument as t.NumericLiteral).value : null;
                    const rNum = t.isNumericLiteral(right) ? right.value : isNegativeNumericLiteral(right) ? -(right.argument as t.NumericLiteral).value : null;

                    if (lStr !== null && rNum !== null) {
                        path.replaceWith(t.stringLiteral(lStr + rNum));
                        self.setChanged();
                        return;
                    }
                    if (lNum !== null && rStr !== null) {
                        path.replaceWith(t.stringLiteral(lNum + rStr));
                        self.setChanged();
                        return;
                    }
                }
            }
        });

        return this.hasChanged();
    }
}
