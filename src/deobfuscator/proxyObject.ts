import * as t from '@babel/types';
import { ConstantVariable } from './variable';
import { copyExpression } from './misc';
import { ProxyFunction, isProxyFunctionExpression } from './proxyFunction';
import { NodePath } from '@babel/traverse';

export type ProxyObjectExpression = t.ObjectExpression;

/**
 * Returns whether a node is a non-empty object expression (candidate for a proxy object).
 */
export const isProxyObjectExpression = (node: t.Node): node is ProxyObjectExpression => {
    return t.isObjectExpression(node) && node.properties.length > 0;
};

/**
 * Represents a constant object variable whose properties can be inlined at
 * every usage site.
 */
export class ProxyObject {
    private readonly variable: ConstantVariable<ProxyObjectExpression>;
    private readonly literalProperties: Map<string | number, t.Expression> = new Map();
    private readonly proxyFunctionProperties: Map<string | number, ProxyFunction> = new Map();

    constructor(variable: ConstantVariable<ProxyObjectExpression>) {
        this.variable = variable;
    }

    /**
     * Iterates the object's properties and records which ones can be inlined.
     */
    public process(): void {
        for (const property of this.variable.expression.properties) {
            if (t.isObjectProperty(property) && this.isLiteralPropertyKey(property)) {
                const key = t.isIdentifier(property.key)
                    ? property.key.name
                    : (property.key as t.StringLiteral | t.NumericLiteral).value;
                if (t.isLiteral(property.value)) {
                    this.literalProperties.set(key, property.value);
                } else if (isProxyFunctionExpression(property.value)) {
                    this.proxyFunctionProperties.set(key, new ProxyFunction(property.value));
                }
            } else if (t.isObjectMethod(property) && this.isLiteralMethodKey(property)) {
                const key = t.isIdentifier(property.key)
                    ? property.key.name
                    : (property.key as t.StringLiteral | t.NumericLiteral).value;
                if (isProxyFunctionExpression(property)) {
                    this.proxyFunctionProperties.set(key, new ProxyFunction(property));
                }
            }
        }
    }

    /** Returns all reference paths to the object variable. */
    public getUsages(): NodePath[] {
        return this.variable.binding.referencePaths;
    }

    /**
     * Attempts to replace a single usage of the object with the inlined value.
     * @returns Whether the replacement was made.
     */
    public replaceUsage(path: NodePath): boolean {
        const parentPath = path.parentPath;
        if (
            parentPath &&
            parentPath.isMemberExpression() &&
            this.isLiteralMemberKey(parentPath.node) &&
            (!parentPath.parentPath ||
                !parentPath.parentPath.isAssignmentExpression() ||
                parentPath.parentKey != 'left')
        ) {
            const key = t.isIdentifier(parentPath.node.property)
                ? parentPath.node.property.name
                : (parentPath.node.property as t.StringLiteral | t.NumericLiteral).value;

            if (this.literalProperties.has(key)) {
                const value = this.literalProperties.get(key) as t.Expression;
                parentPath.replaceWith(copyExpression(value));
                return true;
            } else if (
                parentPath.parentPath &&
                parentPath.parentPath.isCallExpression() &&
                parentPath.key == 'callee' &&
                this.proxyFunctionProperties.has(key)
            ) {
                const proxyFunction = this.proxyFunctionProperties.get(key) as ProxyFunction;
                const replacement = proxyFunction.getReplacement(
                    parentPath.parentPath.node.arguments
                );
                parentPath.parentPath.replaceWith(replacement);
                return true;
            }
        }
        return false;
    }

    private isLiteralPropertyKey(
        property: t.ObjectProperty
    ): property is
        | (t.ObjectProperty & { key: t.StringLiteral | t.NumericLiteral })
        | (t.ObjectProperty & { computed: false; key: t.Identifier }) {
        return (
            t.isStringLiteral(property.key) ||
            t.isNumericLiteral(property.key) ||
            (!property.computed && t.isIdentifier(property.key))
        );
    }

    private isLiteralMethodKey(
        property: t.ObjectMethod
    ): property is
        | (t.ObjectMethod & { key: t.StringLiteral | t.NumericLiteral })
        | (t.ObjectMethod & { computed: false; key: t.Identifier }) {
        return (
            t.isStringLiteral(property.key) ||
            t.isNumericLiteral(property.key) ||
            (!property.computed && t.isIdentifier(property.key))
        );
    }

    private isLiteralMemberKey(
        member: t.MemberExpression
    ): member is
        | (t.MemberExpression & { property: t.StringLiteral | t.NumericLiteral })
        | (t.MemberExpression & { computed: false; property: t.Identifier }) {
        return (
            t.isStringLiteral(member.property) ||
            t.isNumericLiteral(member.property) ||
            (!member.computed && t.isIdentifier(member.property))
        );
    }
}
