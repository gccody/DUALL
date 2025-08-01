export type TOTPAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export type TOTPEncoding = "hex" | "ascii" | "base32";
export type TokenType = "TOTP" | "HOTP";

// Base options that are common to both TOTP and HOTP
export type BaseOtpOptions = {
	digits?: number;
	algorithm?: TOTPAlgorithm;
	encoding?: TOTPEncoding;
};

export type TOTPOptions = BaseOtpOptions & {
	period?: number;
	timestamp?: number;
};

export type HOTPOptions = BaseOtpOptions & {
	counter: number; // counter is required for HOTP
};

export type TOTPResult = { otp: string; expires: number };
export type HOTPResult = { otp: string }; // Add HOTPResult type

export interface TOTPFile {
	services: Service[];
	groups: Group[];
	settings: Settings;
}

export interface PartialTOTPFile {
	services: Service[];
	groups: Group[];
}

export interface Service {
	position: number;
	updatedAt: number;
	name: string;
	uid: string;
	icon: Icon;
	otp: OTP;
	secret: string;
}

export interface Icon {
	label: string;
}

export interface OTP {
	link: string;
	algorithm: TOTPAlgorithm;
	period: number | undefined;
	tokenType: TokenType;
	issuer: string;
	digits: number;
}

export interface Group {
	defaultExpanded: boolean;
	uid: string;
	name: string;
}

export interface Settings {
	darkMode: boolean;
	searchOnStartup: boolean;
	hideTokens: boolean;
	showNextToken: boolean;
	notifyWhenTokenCopied: boolean;
}

/**
 * Defines the base structure for parsed OTP data.
 */
export interface BaseOtpData {
	label: string;
	secret: string;
	issuer?: string; // Optional
	algorithm: TOTPAlgorithm; // Allow known + other strings
	digits: number;
}

/**
 * Defines the structure for parsed TOTP (Time-based OTP) data.
 */
export interface TotpData extends BaseOtpData {
	type: "totp";
	period: number; // Required for TOTP
}

/**
 * Defines the structure for parsed HOTP (HMAC-based OTP) data.
 */
export interface HotpData extends BaseOtpData {
	type: "hotp";
	counter: number; // Required for HOTP
}

/**
 * Represents the possible successful return types from the parser.
 */
export type OtpAuthData = TotpData | HotpData;