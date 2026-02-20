import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { LogFunction, Transformation, TransformationProperties } from './transformation';
import { ConstantAssignmentVariable, findConstantVariable } from './variable';
import { copyExpression } from './misc';

/**
 * Type for literals which can be safely propagated.
 * RegExpLiterals are excluded due to identity-comparison issues.
 */
type Literal = Exclude<t.Literal, t.RegExpLiteral>;

const isLiteral = (node: t.Node): node is Literal => {
    return t.isLiteral(node) && !t.isRegExpLiteral(node);
};

/**
 * Propagates constant literal variables to all their usage sites and removes
 * the original declarations, e.g.:
 *
 *   var x = 'hello';
 *   console.log(x);  →  console.log('hello');
 */
export class ConstantPropgator extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'constantPropagation',
        rebuildScopeTree: true
    };

    /**
     * Executes the transformation.
     * @param log The log function.
     */
    public execute(log: LogFunction): boolean {
        const self = this;

        traverse(this.ast, {
            enter(path) {
                const variable = findConstantVariable<Literal>(path, isLiteral);
                if (!variable) {
                    return;
                }

                // Avoid propagating params that are assigned to within branches
                if (variable instanceof ConstantAssignmentVariable) {
                    if (variable.binding.path.parentKey == 'params') {
                        const functionParent =
                            variable.binding.path.getStatementParent() as NodePath<t.Function>;
                        const parentPath = path.getStatementParent() as NodePath<t.Statement>;
                        if (parentPath.parent != functionParent.node.body) {
                            return;
                        }
                    }
                }

                for (const referencePath of variable.binding.referencePaths) {
                    const expression = copyExpression(variable.expression);
                    referencePath.replaceWith(expression);
                    self.setChanged();
                }

                variable.remove();
            }
        });

        return this.hasChanged();
    }
}
