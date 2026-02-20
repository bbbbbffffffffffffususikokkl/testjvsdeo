import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

/**
 * Deep-copies a Babel expression node so that it can be safely inserted at
 * multiple locations in the AST without sharing references.
 */
export function copyExpression<T extends t.Expression>(expression: T): T {
    return t.cloneDeepWithoutLoc(expression) as T;
}

const PROPERTY_KEY = '__manus_deob_props__';

/**
 * Attaches an arbitrary property to a NodePath without modifying the AST node.
 * Used to track traversal depth etc.
 */
export function setProperty(path: NodePath, key: string, value: unknown): void {
    if (!(PROPERTY_KEY in path)) {
        (path as any)[PROPERTY_KEY] = {};
    }
    (path as any)[PROPERTY_KEY][key] = value;
}

/**
 * Retrieves a property previously attached via {@link setProperty}.
 */
export function getProperty(path: NodePath, key: string): any {
    return (path as any)[PROPERTY_KEY]?.[key];
}
