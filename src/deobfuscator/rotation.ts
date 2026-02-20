import * as t from '@babel/types';
import { StringDecoder } from './stringDecoder';

/**
 * Rotates the string array to the correct position by simulating the rotation
 * loop that obfuscator.io inserts.
 *
 * @param stringArray  The mutable string array to rotate in-place.
 * @param expression   The binary expression used to compute the stop condition.
 * @param decoderMap   Map from wrapper function name to its decoder.
 * @param stopValue    The target value that the loop checks against.
 */
export function rotateStringArray(
    stringArray: string[],
    expression: t.BinaryExpression,
    decoderMap: Map<string, StringDecoder>,
    stopValue: number
): void {
    // Simulate up to 1 000 000 rotations (same as the original implementation)
    for (let i = 0; i < 1_000_000; i++) {
        try {
            const result = evaluateExpression(expression, decoderMap, stringArray);
            if (result === stopValue) {
                break;
            }
        } catch {
            // If evaluation fails, rotate and try again
        }
        stringArray.push(stringArray.shift()!);
    }
}

// ── Expression evaluator ──────────────────────────────────────────────────────

function evaluateExpression(
    expression: t.BinaryExpression,
    decoderMap: Map<string, StringDecoder>,
    stringArray: string[]
): number {
    const left = evaluateNode(expression.left, decoderMap, stringArray);
    const right = evaluateNode(expression.right, decoderMap, stringArray);

    switch (expression.operator) {
        case '+': return (left as number) + (right as number);
        case '-': return (left as number) - (right as number);
        case '*': return (left as number) * (right as number);
        case '/': return (left as number) / (right as number);
        case '%': return (left as number) % (right as number);
        default:
            throw new Error(`Unsupported operator: ${expression.operator}`);
    }
}

function evaluateNode(
    node: t.Expression | t.PrivateName,
    decoderMap: Map<string, StringDecoder>,
    stringArray: string[]
): number | string {
    if (t.isNumericLiteral(node)) {
        return node.value;
    }

    if (t.isStringLiteral(node)) {
        return node.value;
    }

    if (t.isUnaryExpression(node) && node.operator == '-') {
        return -(evaluateNode(node.argument, decoderMap, stringArray) as number);
    }

    if (t.isCallExpression(node) && t.isIdentifier(node.callee)) {
        const decoder = decoderMap.get(node.callee.name);
        if (decoder) {
            const args = node.arguments.map(a => {
                if (t.isNumericLiteral(a)) return a.value;
                if (t.isStringLiteral(a)) return a.value;
                throw new Error('Unsupported argument type');
            });
            const result = (decoder.getString as (...a: (number | string)[]) => string | undefined)(
                ...args
            );
            if (result == undefined) {
                throw new Error('String not found');
            }
            return parseInt(result, 10);
        }
    }

    if (t.isBinaryExpression(node)) {
        return evaluateExpression(node, decoderMap, stringArray);
    }

    throw new Error(`Cannot evaluate node type: ${node.type}`);
}
