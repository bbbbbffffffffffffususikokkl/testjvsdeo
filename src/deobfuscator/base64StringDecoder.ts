import { DecoderType, StringDecoder } from './stringDecoder';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Decodes a base64-encoded string from the string array.
 * Mirrors the obfuscator.io base64 decode routine.
 */
export class Base64StringDecoder extends StringDecoder {
    constructor(stringArray: string[], offset: number) {
        super(stringArray, offset, DecoderType.Base64);
    }

    public getString(index: number): string | undefined {
        const adjusted = index - this.offset;
        const encoded = this.stringArray[adjusted];
        if (encoded == undefined) {
            return undefined;
        }
        return this.decode(encoded);
    }

    private decode(encoded: string): string {
        let output = '';
        let i = 0;

        // Remove non-base64 characters
        const str = encoded.replace(/[^A-Za-z0-9+/=]/g, '');

        while (i < str.length) {
            const enc1 = BASE64_CHARS.indexOf(str.charAt(i++));
            const enc2 = BASE64_CHARS.indexOf(str.charAt(i++));
            const enc3 = BASE64_CHARS.indexOf(str.charAt(i++));
            const enc4 = BASE64_CHARS.indexOf(str.charAt(i++));

            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;

            output += String.fromCharCode(chr1);
            if (enc3 != 64) {
                output += String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output += String.fromCharCode(chr3);
            }
        }

        // Decode UTF-8
        try {
            return decodeURIComponent(
                output
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
        } catch {
            return output;
        }
    }
}
