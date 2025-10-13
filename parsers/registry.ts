import type { OtpAuthData } from "../types";
import type { OtpProvider, ParseResult } from "./types";

import { BitwardenParser } from "@/parsers/providers/bitwardenParse";
import { GoogleAuthParser } from "@/parsers/providers/googleParse";
import { TwoFASParser } from "@/parsers/providers/twoFAsParse";

export class ProviderRegistry {
  private providers: Map<string, OtpProvider> = new Map();

  constructor() {
    // Register default providers
    this.register(new GoogleAuthParser());
    this.register(new TwoFASParser());
    this.register(new BitwardenParser());
  }

  /**
   * Register a new provider
   */
  register(provider: OtpProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): OtpProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): OtpProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Automatically detect and parse data from any registered provider
   */
  parseAuto(data: string | unknown): ParseResult {
    let parsedData = data;

    // Try to parse as JSON if string
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch {
        // Keep as string if not valid JSON
        parsedData = data;
      }
    }

    // Try each provider
    for (const provider of this.providers.values()) {
      if (provider.canParse(parsedData)) {
        try {
          const result = provider.parse(parsedData);
          return {
            provider: provider.name,
            data: result,
          };
        } catch (error) {
          // Continue to next provider if parsing fails
          console.warn(`${provider.name} detection passed but parsing failed:`, error);
        }
      }
    }

    throw new Error("No compatible provider found for this data");
  }

  /**
   * Parse with a specific provider
   */
  parseWith(providerName: string, data: string | unknown): OtpAuthData[] {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }

    return provider.parse(data);
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();