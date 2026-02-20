import traverse, { NodePath } from '@babel/traverse';
import { LogFunction, Transformation, TransformationProperties } from './transformation';
import * as m from '@codemod/matchers';

/**
 * Removes obfuscator.io anti-tamper constructs:
 *   - Self-defending function (prevents code modification)
 *   - Debug protection (freezes devtools)
 *   - Console output disabling
 */
export class AntiTamperRemover extends Transformation {
    public static readonly properties: TransformationProperties = {
        key: 'antiTamperRemoval',
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
                /*
                 * Matches the generic wrapper used to call self-defending,
                 * debug-protection and console-output-disabling functions:
                 *
                 * var _0x34a66a = (function () {
                 *     var _0x634fc3 = true;
                 *     return function (_0x446108, _0x8e5201) {
                 *         var _0x3cb39f = _0x634fc3
                 *             ? function () { if (_0x8e5201) { … } }
                 *             : function () {};
                 *         _0x634fc3 = false;
                 *         return _0x3cb39f;
                 *     };
                 * })();
                 */
                const wrapperName = m.capture(m.identifier());
                const functionWrapper = m.variableDeclaration('var', [
                    m.variableDeclarator(
                        wrapperName,
                        m.callExpression(
                            m.functionExpression(
                                null,
                                [],
                                m.blockStatement([
                                    m.variableDeclaration('var', [
                                        m.variableDeclarator(m.identifier(), m.booleanLiteral(true))
                                    ]),
                                    m.returnStatement(
                                        m.functionExpression(
                                            null,
                                            [m.identifier(), m.identifier()],
                                            m.blockStatement([
                                                m.variableDeclaration('var', [
                                                    m.variableDeclarator(
                                                        m.identifier(),
                                                        m.conditionalExpression(
                                                            m.identifier(),
                                                            m.functionExpression(
                                                                null,
                                                                [],
                                                                m.blockStatement()
                                                            ),
                                                            m.functionExpression(
                                                                null,
                                                                [],
                                                                m.blockStatement([])
                                                            )
                                                        )
                                                    )
                                                ]),
                                                m.expressionStatement(
                                                    m.assignmentExpression(
                                                        '=',
                                                        m.identifier(),
                                                        m.booleanLiteral(false)
                                                    )
                                                ),
                                                m.returnStatement(m.identifier())
                                            ])
                                        )
                                    )
                                ])
                            ),
                            []
                        )
                    )
                ]);

                /*
                 * Matches self-defending calls:
                 * var _0x37696c = _0x351e96(this, function () {
                 *     return _0x37696c.toString().search("(((.+)+)+)+$")…;
                 * });
                 */
                const selfDefendingName = m.capture(m.identifier());
                const selfDefendingCall = m.variableDeclaration('var', [
                    m.variableDeclarator(
                        selfDefendingName,
                        m.callExpression(m.identifier(), [
                            m.thisExpression(),
                            m.functionExpression(
                                null,
                                [],
                                m.blockStatement([m.returnStatement(m.callExpression())])
                            )
                        ])
                    )
                ]);

                /*
                 * Matches debug-protection calls:
                 * _0x248aac(this, function () {
                 *     var _0x1459a4 = new RegExp('function *\\( *\\)');
                 *     var _0x3fc097 = new RegExp('\\+\\+ *(?:[a-zA-Z_$]…)', 'i');
                 *     var _0x22eedd = _0x3668ff('init');
                 *     if (!_0x1459a4.test(…) || !_0x3fc097.test(…)) { _0x22eedd('0'); }
                 *     else { _0x3668ff(); }
                 * })();
                 */
                const debugProtectionName = m.capture(m.identifier());
                const debugProtectionCall = m.expressionStatement(
                    m.callExpression(
                        m.callExpression(m.identifier(), [
                            m.thisExpression(),
                            m.functionExpression(
                                null,
                                [],
                                m.blockStatement([
                                    m.variableDeclaration('var', [
                                        m.variableDeclarator(
                                            m.identifier(),
                                            m.newExpression(m.identifier('RegExp'))
                                        )
                                    ]),
                                    m.variableDeclaration('var', [
                                        m.variableDeclarator(
                                            m.identifier(),
                                            m.newExpression(m.identifier('RegExp'))
                                        )
                                    ]),
                                    m.variableDeclaration('var', [
                                        m.variableDeclarator(
                                            m.identifier(),
                                            m.callExpression(debugProtectionName)
                                        )
                                    ]),
                                    m.ifStatement(
                                        m.logicalExpression(),
                                        m.blockStatement([
                                            m.expressionStatement(
                                                m.callExpression(m.identifier(), [
                                                    m.stringLiteral('0')
                                                ])
                                            )
                                        ]),
                                        m.blockStatement([
                                            m.expressionStatement(
                                                m.callExpression(m.identifier(), [])
                                            )
                                        ])
                                    )
                                ])
                            )
                        ]),
                        []
                    )
                );

                /*
                 * Matches console-output disabling:
                 * var _0x47a7a6 = _0x5ec4cc(this, function () {
                 *     var _0x3fa604;
                 *     try { … } catch (_0x425a7f) { _0x3fa604 = window; }
                 *     var _0x391b61 = _0x3fa604.console = …;
                 *     var _0x3911f6 = ["log", 'warn', …];
                 *     for (var _0x3080b9 = 0x0; …) { … }
                 * });
                 */
                const consoleOutputName = m.capture(m.identifier());
                const consoleOutputCall = m.variableDeclaration('var', [
                    m.variableDeclarator(
                        consoleOutputName,
                        m.callExpression(m.identifier(), [
                            m.thisExpression(),
                            m.functionExpression(
                                null,
                                [],
                                m.blockStatement([
                                    m.variableDeclaration('var', [
                                        m.variableDeclarator(m.identifier(), null)
                                    ]),
                                    m.tryStatement(),
                                    m.variableDeclaration(),
                                    m.variableDeclaration('var', [
                                        m.variableDeclarator(m.identifier(), m.arrayExpression())
                                    ]),
                                    m.forStatement()
                                ])
                            )
                        ])
                    )
                ]);

                let failedReplacement = false;

                if (functionWrapper.match(path.node)) {
                    const binding = path.scope.getBinding(wrapperName.current!.name);
                    if (binding) {
                        for (const reference of binding.referencePaths) {
                            const parent = reference.getStatementParent() as NodePath;

                            if (selfDefendingCall.match(parent.node)) {
                                const selfDefendingBinding = parent.scope.getBinding(
                                    selfDefendingName.current!.name
                                );
                                if (selfDefendingBinding) {
                                    for (const selfDefendingReference of selfDefendingBinding.referencePaths) {
                                        selfDefendingReference.getStatementParent()?.remove();
                                        self.setChanged();
                                    }
                                }
                                if (!parent.removed) {
                                    parent.remove();
                                    self.setChanged();
                                }
                            } else if (debugProtectionCall.match(parent.node)) {
                                // Remove the actual anti-debug function declaration
                                const antiDebugBinding = parent.scope.getBinding(
                                    debugProtectionName.current!.name
                                );
                                if (antiDebugBinding) {
                                    antiDebugBinding.path.remove();
                                    self.setChanged();
                                }
                                // Remove the IIFE wrapper around the call
                                parent
                                    .parentPath!.getStatementParent()
                                    ?.getStatementParent()
                                    ?.remove();
                            } else if (consoleOutputCall.match(parent.node)) {
                                const consoleOutputBinding = parent.scope.getBinding(
                                    consoleOutputName.current!.name
                                );
                                if (consoleOutputBinding) {
                                    for (const consoleOutputReference of consoleOutputBinding.referencePaths) {
                                        consoleOutputReference.getStatementParent()!.remove();
                                        self.setChanged();
                                    }
                                }
                            } else {
                                // Ignore references that are within the console output function
                                const possibleParent = parent
                                    .getFunctionParent()
                                    ?.getStatementParent();
                                if (
                                    possibleParent &&
                                    consoleOutputCall.match(possibleParent.node)
                                ) {
                                    continue;
                                }
                                log('Unknown reference to generic self defending function wrapper');
                                failedReplacement = true;
                            }
                        }
                    }

                    if (!failedReplacement) {
                        path.remove();
                        self.setChanged();
                    }
                }
            }
        });

        return this.hasChanged();
    }
}
