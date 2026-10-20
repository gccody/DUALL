import { searchServices } from "@/hooks/useSearch";
import type { Service } from "@/types";

function service(name: string, issuer: string): Service {
  return {
    position: 0,
    updatedAt: 0,
    uid: `${issuer}:${name}`,
    name,
    secret: "JBSWY3DPEHPK3PXP",
    otp: {
      algorithm: "SHA-1",
      period: 30,
      issuer,
      digits: 6,
    },
  };
}

const github = service("octocat", "GitHub");
const aws = service("root", "Amazon Web Services");
const google = service("alice@example.com", "Google");
const services = [github, aws, google];

describe("searchServices", () => {
  test("returns every service in order for an empty query", () => {
    expect(searchServices(services, "")).toEqual(services);
  });

  test("matches in the middle of an issuer", () => {
    expect(searchServices(services, "hub")[0]).toBe(github);
    expect(searchServices(services, "services")[0]).toBe(aws);
  });

  test("matches in the middle of a name", () => {
    expect(searchServices(services, "example")[0]).toBe(google);
  });

  test("ignores case", () => {
    expect(searchServices(services, "GITHUB")[0]).toBe(github);
  });

  test("returns nothing when no service is close", () => {
    expect(searchServices(services, "zzqx")).toEqual([]);
  });
});
