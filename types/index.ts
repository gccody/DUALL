export type TOTPAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export interface TOTPFile {
	services: Service[];
	groups: Group[];
	settings: Settings;
}

export interface Service {
  position: number;
  updatedAt: number;
  name: string;
  uid: string;
  icon?: Icon;
  otp: ServiceOtp;
  secret: string;
}

export interface Icon {
  label: string;
}

/**
 * TOTP parameters of a service. Data stored by older versions may still carry
 * `link`/`tokenType`, an undefined `period` or a non-normalized `algorithm`;
 * read it through getTotpParams() from "@/core/service".
 */
export interface ServiceOtp {
	issuer: string;
	algorithm: TOTPAlgorithm;
	digits: number;
	period: number;
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
	useBiometrics: boolean;
}
