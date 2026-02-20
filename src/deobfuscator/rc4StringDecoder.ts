import { DecoderType, StringDecoder } from './stringDecoder';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Decodes an RC4-encrypted, base64-encoded string from the string array.
 * Mirrors the obfuscator.io RC4 decode routine exactly.
 */
export class Rc4StringDecoder extends StringDecoder {
    constructor(stringArray: string[], offset: number) {
        super(stringArray, offset, DecoderType.RC4);
    }

    public getString(index: number, key: string): string | undefined {
        const adjusted = index - this.offset;
        const encoded = this.stringArray[adjusted];
        if (encoded == undefined || key == undefined) {
            return undefined;
        }
        return this.decode(encoded, key);
    }

    private decode(encoded: string, key: string): string {
        // Step 1: base64 decode
        const base64Decoded = this.base64Decode(encoded);

        // Step 2: RC4 decrypt
        let s: number[] = [];
        let j = 0;
        let output = '';

        for (let i = 0; i < 256; i++) {
            s[i] = i;
        }

        for (let i = 0; i < 256; i++) {
            j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
            [s[i], s[j]] = [s[j], s[i]];
        }

        let i = 0;
        j = 0;
        for (let x = 0; x < base64Decoded.length; x++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            [s[i], s[j]] = [s[j], s[i]];
            output += String.fromCharCode(
                base64Decoded.charCodeAt(x) ^ s[(s[i] + s[j]) % 256]
            );
        }

        // Step 3: decode UTF-8
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

    private base64Decode(encoded: string): string {
        let output = '';
        let i = 0;
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

        return output;
    }
}
