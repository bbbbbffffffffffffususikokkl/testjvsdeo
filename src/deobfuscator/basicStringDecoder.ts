import { DecoderType, StringDecoder } from './stringDecoder';

/**
 * Decodes a string from the string array using a simple numeric index + offset.
 */
export class BasicStringDecoder extends StringDecoder {
    constructor(stringArray: string[], offset: number) {
        super(stringArray, offset, DecoderType.Basic);
    }

    public getString(index: number): string | undefined {
        const adjusted = index - this.offset;
        return this.stringArray[adjusted];
    }
}
