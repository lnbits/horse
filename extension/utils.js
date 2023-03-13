import { base64 } from '@scure/base'
import { randomBytes, hexToBytes } from '@noble/hashes/utils'
import { Point } from '@noble/secp256k1'

export const utf8Decoder = new TextDecoder('utf-8')
export const utf8Encoder = new TextEncoder()


export async function encrypt(sharedSecret, text) {
    sharedSecret = hexToBytes(sharedSecret)
    let iv = Uint8Array.from((0, randomBytes)(16))
    let plaintext = utf8Encoder.encode(text)
    let cryptoKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
    )
    let ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        plaintext
    )
    let ctb64 = base64.encode(new Uint8Array(ciphertext))
    let ivb64 = base64.encode(new Uint8Array(iv.buffer))
    return `${ctb64}?iv=${ivb64}`
}

export async function decrypt(sharedSecret, data) {
    sharedSecret = hexToBytes(sharedSecret)
    let [ctb64, ivb64] = data.split('?iv=')
    let cryptoKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
    )
    let ciphertext = base64.decode(ctb64)
    let iv = base64.decode(ivb64)
    let plaintext = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        ciphertext
    )
    let text = utf8Decoder.decode(plaintext)
    return text
}


export function xOnlyToXY(p) {
    return Point.fromHex(p).toHex().substring(2)
}