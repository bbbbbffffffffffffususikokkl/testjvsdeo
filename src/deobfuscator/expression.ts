import * as t from '@babel/types';

/**
 * Returns whether a node is a negative numeric literal, i.e. a unary `-`
 * expression applied to a numeric literal.
 */
export function isNegativeNumericLiteral(
    node: t.Node
): node is t.UnaryExpression & { operator: '-'; argument: t.NumericLiteral } {
    return (
        t.isUnaryExpression(node) &&
        node.operator == '-' &&
        t.isNumericLiteral(node.argument)
    );
}
