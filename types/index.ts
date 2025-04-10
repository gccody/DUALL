export interface TOTP_Opts {
    digits?: number;
    algorithm?: "SHA-1" | "SHA-224" | "SHA-256" | "SHA-384" | "SHA-512" | "SHA3-224" | "SHA3-256" | "SHA3-384" | "SHA3-512" | undefined;
    period?: number;
    timestamp?: number;
}