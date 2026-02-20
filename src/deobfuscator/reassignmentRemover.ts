import * as t from '@babel/types';
import { LogFunction, Transformation, TransformationProperties } from './transformation';
import { findConstantVariable } from './variable';
import traverse, { Binding } from '@babel/traverse';

/**
 * Removes redundant variable re-assignments where a variable is simply
 * assigned the value of another constant variable, e.g.:
 *
 *   var a = someValue;
 *   var b = a;
 *   use(b);  →  use(a);
 */
export class ReassignmentRemover extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'reassignmentRemoval',
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
                const variable = findConstantVariable<t.Identifier>(path, t.isIdentifier);
                if (!variable || variable.name == variable.expression.name) {
                    return;
                }

                // Check that the variable we would replace with isn't reassigned multiple times
                const assignedBinding = path.scope.getBinding(variable.expression.name);
                if (
                    assignedBinding &&
                    !assignedBinding.constant &&
                    !(
                        (assignedBinding.constantViolations.length == 1 &&
                            assignedBinding.path.isVariableDeclarator() &&
                            assignedBinding.path.node.init == undefined) ||
                        self.isExcludedConstantViolation(assignedBinding)
                    )
                ) {
                    return;
                }

                for (const referencePath of variable.binding.referencePaths) {
                    referencePath.replaceWith(t.identifier(variable.expression.name));
                    self.setChanged();
                }

                // Remove any declarations of the variable we are replacing
                for (const declarationPath of [
                    ...variable.binding.constantViolations,
                    variable.binding.path
                ]) {
                    if (declarationPath != path) {
                        declarationPath.remove();
                    }
                }

                if (
                    path.isStatement() ||
                    path.isVariableDeclarator() ||
                    (path.parentPath &&
                        (path.parentPath.isStatement() ||
                            (path.parentPath.isSequenceExpression() &&
                                path.node !=
                                    path.parentPath.node.expressions[
                                        path.parentPath.node.expressions.length - 1
                                    ])))
                ) {
                    path.remove();
                } else {
                    // Might have side effects — replace with RHS instead
                    path.replaceWith(variable.expression);
                }
            }
        });

        return this.hasChanged();
    }

    /**
     * Checks whether a binding has a constant violation that reassigns a
     * function from within itself (e.g. string decoder), and thus should be
     * treated as effectively constant.
     */
    private isExcludedConstantViolation(assignedBinding: Binding): boolean {
        if (
            assignedBinding.constantViolations.length == 1 &&
            assignedBinding.path.isFunctionDeclaration()
        ) {
            const functionParent =
                assignedBinding.constantViolations[0].getFunctionParent();
            return functionParent != null && functionParent.node == assignedBinding.path.node;
        }
        return false;
    }
}
