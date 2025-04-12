export type TOTPAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
export type TOTPEncoding = "hex" | "ascii" | "base32"
type TokenType = "TOTP" | "HOTP";

export type TOTPOptions = {
	digits?: number
	algorithm?: TOTPAlgorithm
	encoding?: TOTPEncoding
	period?: number
	timestamp?: number
}

export type TOTPResult = { otp: string; expires: number }

export interface TOTPFile {
    services: Service[],
    groups: Group[],
    settings: Settings
}

interface Service {
    position: number,
    updatedAt: number,
    name: string,
    uid: string,
    icon: Icon,
    otp: OTP,
    secret: string
}

interface Icon {
    label: string
}

interface OTP {
    link: string,
    algorithm: TOTPAlgorithm,
    period: number,
    tokenType: TokenType,
    issuer: string,
    digits: number
}

interface Group {
    defaultExpanded: boolean,
    uid: string,
    name: string
}

interface Settings {
    darkMode: boolean,
    searchOnStartup: boolean,
    hideTokens: boolean,
    showNextToken: boolean,
    notifyWhenTokenCopied: boolean,
    
}