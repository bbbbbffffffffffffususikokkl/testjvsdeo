import * as t from '@babel/types';
import { findConstantVariable } from './variable';
import { LogFunction, Transformation, TransformationProperties } from './transformation';
import traverse, { NodePath } from '@babel/traverse';

type EmptyObjectExpression = t.ObjectExpression & { properties: [] };

const isEmptyObjectExpression = (node: t.Node): node is EmptyObjectExpression => {
    return t.isObjectExpression(node) && node.properties.length == 0;
};

/**
 * Packs consecutive property-assignment statements that follow an empty object
 * literal declaration back into the object literal itself, e.g.:
 *
 *   var obj = {};
 *   obj.a = 1;
 *   obj.b = 2;
 *
 * becomes:
 *
 *   var obj = { a: 1, b: 2 };
 */
export class ObjectPacker extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'objectPacking'
    };

    /**
     * Executes the transformation.
     * @param log The log function.
     */
    public execute(log: LogFunction): boolean {
        const self = this;

        traverse(this.ast, {
            enter(path) {
                const variable = findConstantVariable<EmptyObjectExpression>(
                    path,
                    isEmptyObjectExpression
                );
                if (!variable) {
                    return;
                }

                const statementPath = path.getStatementParent();
                if (
                    !statementPath ||
                    statementPath.parentPath == undefined ||
                    typeof statementPath.key != 'number'
                ) {
                    return;
                }

                const statements = (statementPath.parentPath.node as any)[statementPath.parentKey];
                const referencePathSet = new Set(variable.binding.referencePaths);
                let numRemoved = 0;

                for (let i = statementPath.key + 1; i < statements.length; i++) {
                    const node = statements[i];
                    if (
                        t.isExpressionStatement(node) &&
                        self.isPropertyAssignment(node.expression, variable.name)
                    ) {
                        // Handle chained assignments: obj.a = obj.b = value
                        if (self.isPropertyAssignment(node.expression.right, variable.name)) {
                            const properties = [node.expression.left];
                            let right: t.Expression = node.expression.right;
                            while (self.isPropertyAssignment(right, variable.name)) {
                                properties.push((right as t.AssignmentExpression & { left: t.MemberExpression }).left);
                                right = (right as t.AssignmentExpression).right;
                            }

                            if (!t.isLiteral(right)) {
                                break;
                            }

                            for (const { property } of properties as t.MemberExpression[]) {
                                const isComputed =
                                    !t.isStringLiteral(property) &&
                                    !t.isNumericLiteral(property) &&
                                    !t.isIdentifier(property);
                                const objectProperty = t.objectProperty(property, right, isComputed);
                                variable.expression.properties.push(objectProperty);
                                self.setChanged();
                                numRemoved++;
                            }
                        } else {
                            const key = node.expression.left.property;
                            const isComputed =
                                !t.isStringLiteral(key) &&
                                !t.isNumericLiteral(key) &&
                                !t.isIdentifier(key);

                            if (
                                self.hasSelfReference(
                                    node.expression.right,
                                    statementPath,
                                    i,
                                    referencePathSet,
                                    log
                                )
                            ) {
                                break;
                            }

                            const property = t.objectProperty(key, node.expression.right, isComputed);
                            variable.expression.properties.push(property);
                            self.setChanged();
                            numRemoved++;
                        }
                    } else {
                        break;
                    }
                }

                statements.splice(statementPath.key + 1, numRemoved);
            }
        });

        return this.hasChanged();
    }

    private hasSelfReference(
        value: t.Node,
        statementPath: NodePath,
        arrayIndex: number,
        referencePathSet: Set<NodePath>,
        log: LogFunction
    ): boolean {
        try {
            const valuePath = statementPath.parentPath!.get(
                `${statementPath.parentKey}.${arrayIndex}`
            ) as NodePath;
            let hasSelfReference = false;

            traverse(
                value,
                {
                    Identifier(path) {
                        if (referencePathSet.has(path)) {
                            hasSelfReference = true;
                        }
                    }
                },
                valuePath.scope,
                undefined,
                valuePath
            );

            return hasSelfReference;
        } catch (err) {
            log(`Error looking for self reference when object packing: ${err}`);
            return false;
        }
    }

    private isPropertyAssignment(
        node: t.Node,
        objectName: string
    ): node is t.AssignmentExpression & { left: t.MemberExpression } {
        return (
            t.isAssignmentExpression(node) &&
            t.isMemberExpression(node.left) &&
            t.isIdentifier(node.left.object) &&
            node.left.object.name == objectName
        );
    }
}
