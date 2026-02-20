import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { LogFunction, Transformation, TransformationProperties } from './transformation';
import {
    isDeclarationOrAssignmentExpression,
    isDeclarationOrAssignmentStatement
} from './declaration';

// ── Type guards ──────────────────────────────────────────────────────────────

type FlatteningLoopBody = t.BlockStatement & {
    body: [
        t.SwitchStatement & {
            discriminant: t.MemberExpression & {
                object: t.Identifier;
                property: t.UpdateExpression & { argument: t.Identifier };
            };
            cases: (t.SwitchCase & { test: t.StringLiteral })[];
        },
        t.BreakStatement
    ];
};

const isFlatteningLoopBody = (
    node: t.Node,
    statesName: string,
    counterName: string
): node is FlatteningLoopBody => {
    return (
        t.isBlockStatement(node) &&
        node.body.length == 2 &&
        t.isBreakStatement(node.body[1]) &&
        t.isSwitchStatement(node.body[0]) &&
        t.isMemberExpression(node.body[0].discriminant) &&
        t.isIdentifier(node.body[0].discriminant.object) &&
        node.body[0].discriminant.object.name == statesName &&
        t.isUpdateExpression(node.body[0].discriminant.property) &&
        t.isIdentifier(node.body[0].discriminant.property.argument) &&
        node.body[0].discriminant.property.argument.name == counterName &&
        node.body[0].cases.every(c => c.test && t.isStringLiteral(c.test))
    );
};

type FlatteningForLoop = t.ForStatement & {
    init: DeclarationOrAssignmentExpression<t.Identifier, t.NumericLiteral>;
    body: FlatteningLoopBody;
};

type DeclarationOrAssignmentExpression<T extends t.LVal, V extends t.Expression> =
    | (t.VariableDeclaration & {
          declarations: [t.VariableDeclarator & { id: T; init: V }];
      })
    | (t.AssignmentExpression & { left: T; right: V });

const isFlatteningForLoop = (node: t.Node, statesName: string): node is FlatteningForLoop => {
    if (!t.isForStatement(node) || node.init == undefined) return false;
    if (!isDeclarationOrAssignmentExpression(node.init, t.isIdentifier, t.isNumericLiteral)) return false;
    let counterName: string;
    if (t.isAssignmentExpression(node.init) && t.isIdentifier(node.init.left)) {
        counterName = node.init.left.name;
    } else if (t.isVariableDeclaration(node.init) && t.isIdentifier(node.init.declarations[0].id)) {
        counterName = node.init.declarations[0].id.name;
    } else {
        return false;
    }
    return isFlatteningLoopBody(node.body, statesName, counterName);
};

type FlatteningWhileLoop = t.WhileStatement & {
    test: t.BooleanLiteral;
    body: FlatteningLoopBody;
};

const isFlatteningWhileLoop = (
    node: t.Node,
    statesName: string,
    counterName: string
): node is FlatteningWhileLoop => {
    return (
        t.isWhileStatement(node) &&
        t.isBooleanLiteral(node.test) &&
        node.test.value == true &&
        isFlatteningLoopBody(node.body, statesName, counterName)
    );
};

// ── Transformation ───────────────────────────────────────────────────────────

/**
 * Recovers control flow that was flattened by obfuscator.io's control-flow
 * flattening pass.  It detects the characteristic switch-dispatch loop and
 * replaces it with the original sequential statements.
 */
export class ControlFlowRecoverer extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'controlFlowRecovery'
    };

    /**
     * Executes the transformation.
     * @param log The log function.
     */
    public execute(log: LogFunction): boolean {
        const self = this;

        traverse(this.ast, {
            enter(path) {
                // Match: var _states = "0|3|1|2|4".split('|'), _counter = 0;
                if (
                    !path.isVariableDeclaration() ||
                    path.node.declarations.length < 2
                ) {
                    return;
                }

                const declarations = path.node.declarations;

                // First declarator: states = "...".split("|")
                const statesDeclarator = declarations[0];
                if (
                    !t.isIdentifier(statesDeclarator.id) ||
                    !statesDeclarator.init ||
                    !t.isCallExpression(statesDeclarator.init) ||
                    !t.isMemberExpression(statesDeclarator.init.callee) ||
                    !t.isStringLiteral(statesDeclarator.init.callee.object) ||
                    !t.isIdentifier(statesDeclarator.init.callee.property) ||
                    statesDeclarator.init.callee.property.name != 'split' ||
                    statesDeclarator.init.arguments.length != 1 ||
                    !t.isStringLiteral(statesDeclarator.init.arguments[0])
                ) {
                    return;
                }

                const statesName = statesDeclarator.id.name;
                const statesSeparator = statesDeclarator.init.arguments[0].value;
                const statesString = statesDeclarator.init.callee.object.value;
                const states = statesString.split(statesSeparator);

                // Second declarator: counter = 0
                const counterDeclarator = declarations[1];
                if (
                    !t.isIdentifier(counterDeclarator.id) ||
                    counterDeclarator.init == undefined ||
                    !t.isNumericLiteral(counterDeclarator.init) ||
                    counterDeclarator.init.value != 0
                ) {
                    return;
                }

                const counterName = counterDeclarator.id.name;

                // Sibling must be the flattening loop
                const nextSibling = path.getSibling(
                    (path.key as number) + 1
                ) as NodePath<t.Node> | null;
                if (!nextSibling) {
                    return;
                }

                let flatteningLoop: FlatteningForLoop | FlatteningWhileLoop | undefined = undefined;

                if (isFlatteningForLoop(nextSibling.node, statesName)) {
                    // Update counterName from the for-loop init if it's an assignment
                    const forInit = nextSibling.node.init;
                    if (forInit && t.isAssignmentExpression(forInit) && t.isIdentifier(forInit.left)) {
                        // counterName already set from the var declaration above
                    }
                    flatteningLoop = nextSibling.node;
                } else if (
                    isFlatteningWhileLoop(nextSibling.node, statesName, counterName)
                ) {
                    flatteningLoop = nextSibling.node;
                } else {
                    return;
                }

                // Build a map from state string → case body statements
                const caseMap = new Map<string, t.Statement[]>();
                for (const switchCase of flatteningLoop.body.body[0].cases) {
                    const key = (switchCase.test as t.StringLiteral).value;
                    // Drop the trailing `continue` statement if present
                    const body = switchCase.consequent.filter(
                        s => !t.isContinueStatement(s)
                    );
                    caseMap.set(key, body);
                }

                // Reconstruct the original statement order
                const recovered: t.Statement[] = [];
                for (const state of states) {
                    const stmts = caseMap.get(state);
                    if (!stmts) {
                        log(`Missing case for state ${state}`);
                        return;
                    }
                    recovered.push(...stmts);
                }

                // Replace the two nodes (var declaration + loop) with the recovered statements
                path.replaceWithMultiple(recovered);
                nextSibling.remove();
                self.setChanged();
            }
        });

        return this.hasChanged();
    }
}
