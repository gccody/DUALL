export type TOTPAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export interface Service {
  position: number;
  updatedAt: number;
  name: string;
  uid: string;
  /** Unset: auto-match a bundled icon by issuer. `null`: the user removed the icon. */
  icon?: Icon | null;
  otp: ServiceOtp;
  secret: string;
}

export interface Icon {
  /** Domain of a bundled icon, e.g. "github.com" (see utils/customIconMatcher) */
  label: string;
}

/**
 * TOTP parameters of a service. Data written by older versions (with
 * `link`/`tokenType`, a missing `period` or algorithms like "SHA1") is
 * normalized by storage/migrations; read the parameters through
 * getTotpParams() from "@/core/service", which still guards against bad values.
 */
export interface ServiceOtp {
	issuer: string;
	algorithm: TOTPAlgorithm;
	digits: number;
	period: number;
}

export interface Settings {
	darkMode: boolean;
	searchOnStartup: boolean;
	hideTokens: boolean;
	showNextToken: boolean;
	notifyWhenTokenCopied: boolean;
	useBiometrics: boolean;
}
