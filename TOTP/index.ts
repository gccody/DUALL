import { TOTPAlgorithm, TOTPEncoding, TOTPOptions, TOTPResult } from "@/types"
import CryptoES from "crypto-es"
import base32 from "hi-base32"

export class TOTP {
	static generate(key: string, options?: TOTPOptions): TOTPResult {
		const _options: Required<TOTPOptions> = {
			digits: 6,
			algorithm: "SHA-1",
			encoding: "base32",
			period: 30,
			timestamp: Date.now(),
			...options,
		}

		const epochSeconds = Math.floor(_options.timestamp / 1000)
		const counter = Math.floor(epochSeconds / _options.period)
		const timeHex = this.dec2hex(counter).padStart(16, "0")
		const timeBuffer = CryptoES.enc.Hex.parse(timeHex)

		const keyBytes = this.parseKey(key, _options.encoding)

		const hmac = this.getHMAC(keyBytes, timeBuffer, _options.algorithm)
		const hmacHex = hmac.toString(CryptoES.enc.Hex)

		const offset = parseInt(hmacHex.slice(-1), 16)
		const code = hmacHex.substr(offset * 2, 8)
		const masked = parseInt(code, 16) & 0x7fffffff
		const otp = masked.toString().slice(-_options.digits).padStart(_options.digits, "0")

		const period = _options.period * 1000
		const expires = Math.ceil((_options.timestamp + 1) / period) * period

		return { otp, expires }
	}

	private static parseKey(key: string, encoding: TOTPEncoding): CryptoES.lib.WordArray {
		switch (encoding) {
			case "hex":
				return CryptoES.enc.Hex.parse(key)
			case "ascii":
				return CryptoES.enc.Utf8.parse(key)
			case "base32":
				const base32Bytes = base32.decode.asBytes(key.replace(/=+$/, '').toUpperCase())
				const hex = base32Bytes.map(b => b.toString(16).padStart(2, '0')).join('')
				return CryptoES.enc.Hex.parse(hex)
			default:
				throw new Error(`Unsupported encoding: ${encoding}`)
		}
	}

	private static dec2hex(dec: number): string {
		return dec.toString(16)
	}

	private static getHMAC(
		key: CryptoES.lib.WordArray,
		message: CryptoES.lib.WordArray,
		algorithm: TOTPAlgorithm
	): CryptoES.lib.WordArray {
		switch (algorithm) {
			case "SHA-1":
				return CryptoES.HmacSHA1(message, key)
			case "SHA-256":
				return CryptoES.HmacSHA256(message, key)
			case "SHA-384":
				return CryptoES.HmacSHA384(message, key)
			case "SHA-512":
				return CryptoES.HmacSHA512(message, key)
			default:
				throw new Error(`Unsupported algorithm: ${algorithm}`)
		}
	}
}

export class FileHandler {
	
}