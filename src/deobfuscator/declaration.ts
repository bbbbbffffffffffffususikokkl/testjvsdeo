import * as t from '@babel/types';

/**
 * Returns whether a statement is either:
 *   - a variable declaration whose single declarator has an id matching
 *     `isId` and an init matching `isValue`, or
 *   - an expression statement whose expression is an assignment expression
 *     with a left-hand side matching `isId` and a right-hand side matching
 *     `isValue`.
 */
export function isDeclarationOrAssignmentStatement(
    node: t.Node,
    isId: (node: t.Node) => boolean,
    isValue: (node: t.Node) => boolean
): boolean {
    if (
        t.isVariableDeclaration(node) &&
        node.declarations.length == 1 &&
        isId(node.declarations[0].id) &&
        node.declarations[0].init != undefined &&
        isValue(node.declarations[0].init)
    ) {
        return true;
    }

    if (
        t.isExpressionStatement(node) &&
        t.isAssignmentExpression(node.expression) &&
        node.expression.operator == '=' &&
        isId(node.expression.left) &&
        isValue(node.expression.right)
    ) {
        return true;
    }

    return false;
}

/**
 * Returns whether an expression is either:
 *   - a variable declaration (init) matching the guards, or
 *   - an assignment expression matching the guards.
 */
export function isDeclarationOrAssignmentExpression(
    node: t.Node,
    isId: (node: t.Node) => boolean,
    isValue: (node: t.Node) => boolean
): boolean {
    if (
        t.isVariableDeclaration(node) &&
        node.declarations.length == 1 &&
        isId(node.declarations[0].id) &&
        node.declarations[0].init != undefined &&
        isValue(node.declarations[0].init)
    ) {
        return true;
    }

    if (
        t.isAssignmentExpression(node) &&
        node.operator == '=' &&
        isId(node.left) &&
        isValue(node.right)
    ) {
        return true;
    }

    return false;
}
