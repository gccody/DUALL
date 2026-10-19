/// <reference types="jest" />
import type { Service } from "@/types";
import {
  getCustomIcon,
  getCustomIconDomain,
  getIconSource,
  searchCustomIcons,
  warmIconCache,
} from "@/utils/customIconMatcher";
import { ICONS } from "@/utils/iconRegistry.generated";

function serviceWithIssuer(issuer: string, label?: string): Service {
  return {
    position: 0,
    updatedAt: 0,
    uid: issuer,
    name: "alice@example.com",
    secret: "JBSWY3DPEHPK3PXP",
    icon: label ? { label } : undefined,
    otp: {
      link: "",
      algorithm: "SHA-1",
      period: 30,
      tokenType: "TOTP",
      issuer,
      digits: 6,
    },
  };
}

describe("icon registry", () => {
  test("is keyed by bare domain", () => {
    const keys = Object.keys(ICONS);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter(k => k.endsWith(".avif"))).toEqual([]);
    expect(ICONS["github.com"].name).toBe("GitHub");
  });
});

describe("getCustomIconDomain", () => {
  test("matches an issuer by service name", () => {
    expect(getCustomIconDomain(serviceWithIssuer("GitHub"))).toBe("github.com");
    expect(getCustomIconDomain(serviceWithIssuer("github"))).toBe("github.com");
  });

  test("matches a domain-looking issuer directly", () => {
    expect(getCustomIconDomain(serviceWithIssuer("gitlab.com"))).toBe("gitlab.com");
    expect(getCustomIconDomain(serviceWithIssuer("https://GitHub.com"))).toBe("github.com");
  });

  test("returns null when nothing matches", () => {
    expect(getCustomIconDomain(serviceWithIssuer("zzqx-no-such-service-qq"))).toBeNull();
    expect(getCustomIconDomain(serviceWithIssuer(""))).toBeNull();
  });

  test("gives the same answer after warming the cache", () => {
    const services = [serviceWithIssuer("GitHub"), serviceWithIssuer("zzqx-no-such-service-qq")];
    warmIconCache(services);
    expect(services.map(getCustomIconDomain)).toEqual(["github.com", null]);
  });
});

describe("icon sources", () => {
  test("getIconSource returns the registry source or null", () => {
    expect(getIconSource("github.com")).toBe(ICONS["github.com"].source);
    expect(getIconSource("no-such-domain.invalid")).toBeNull();
    expect(getIconSource("toString")).toBeNull();
  });

  test("getCustomIcon resolves through the issuer match", () => {
    expect(getCustomIcon(serviceWithIssuer("GitHub"))).toBe(ICONS["github.com"].source);
    expect(getCustomIcon(serviceWithIssuer("zzqx-no-such-service-qq"))).toBeNull();
  });
});

describe("searchCustomIcons", () => {
  test("finds icons by name or domain, sorted by name", () => {
    const results = searchCustomIcons("git");
    const domains = results.map(r => r.domain);
    expect(domains).toEqual(expect.arrayContaining(["github.com", "gitlab.com"]));

    const names = results.map(r => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const github = results.find(r => r.domain === "github.com");
    expect(github).toEqual({ domain: "github.com", name: "GitHub", icon: ICONS["github.com"].source });
  });

  test("returns an empty list when nothing matches", () => {
    expect(searchCustomIcons("zzqx-no-such-service-qq")).toEqual([]);
  });
});
