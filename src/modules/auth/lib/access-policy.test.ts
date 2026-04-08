import { describe, expect, it } from "vitest";
import { canAccessResource, getAllowedResources } from "./access-policy";

describe("access policy", () => {
  it("grants admin access to all configured resources", () => {
    const resources = getAllowedResources("admin");

    expect(resources).toContain("dashboard");
    expect(resources).toContain("areas");
    expect(resources).toContain("employees");
    expect(resources).toContain("projects");
    expect(resources).toContain("projectBoard");
    expect(resources).toContain("profile");
  });

  it("restricts employee access to admin-only resources", () => {
    expect(canAccessResource("employee", "dashboard")).toBe(true);
    expect(canAccessResource("employee", "projects")).toBe(true);
    expect(canAccessResource("employee", "areas")).toBe(false);
    expect(canAccessResource("employee", "employees")).toBe(false);
  });
});
