import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { LogFunction, Transformation, TransformationProperties } from './transformation';

/**
 * Splits sequence expressions (comma expressions) that appear as standalone
 * expression statements into individual statements, making the code easier to
 * read and enabling further transformations.
 */
export class SequenceSplitter extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'sequenceSplitting'
    };

    /**
     * Executes the transformation.
     * @param log The log function.
     */
    public execute(log: LogFunction): boolean {
        const self = this;

        traverse(this.ast, {
            ConditionalExpression(path) {
                // (a, b, c) ? x : y  →  keep as-is (handled elsewhere)
                if (
                    t.isSequenceExpression(path.node.test) &&
                    path.parentPath &&
                    path.parentPath.isExpressionStatement()
                ) {
                    const expressions = path.node.test.expressions;
                    const last = expressions[expressions.length - 1];
                    const newConditional = t.conditionalExpression(
                        last,
                        path.node.consequent,
                        path.node.alternate
                    );
                    const stmts: t.Statement[] = [
                        ...expressions.slice(0, -1).map(e => t.expressionStatement(e)),
                        t.expressionStatement(newConditional)
                    ];
                    path.parentPath.replaceWithMultiple(stmts);
                    self.setChanged();
                }
            },
            ExpressionStatement(path) {
                if (t.isSequenceExpression(path.node.expression)) {
                    const stmts = path.node.expression.expressions.map(e =>
                        t.expressionStatement(e)
                    );
                    path.replaceWithMultiple(stmts);
                    self.setChanged();
                }
            },
            // Split sequences in for-loop init / update positions
            ForStatement(path) {
                if (path.node.init && t.isSequenceExpression(path.node.init)) {
                    // Cannot split the init of a for-loop directly; leave for later passes
                    return;
                }
            }
        });

        return this.hasChanged();
    }
}
