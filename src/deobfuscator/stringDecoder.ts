export enum DecoderType {
    Basic = 'basic',
    Base64 = 'base64',
    RC4 = 'rc4'
}

export abstract class StringDecoder {
    protected readonly stringArray: string[];
    protected readonly offset: number;
    public readonly type: DecoderType;

    constructor(stringArray: string[], offset: number, type: DecoderType) {
        this.stringArray = stringArray;
        this.offset = offset;
        this.type = type;
    }

    public abstract getString(index: number, key?: string): string | undefined;
}
