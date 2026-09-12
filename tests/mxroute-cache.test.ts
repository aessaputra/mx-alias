import { describe, expect, it } from "vitest";

import {
  DOMAINS_TTL_SECONDS,
  FORWARDERS_TTL_SECONDS,
  forwarderTag,
  MX_DOMAINS_TAG,
  MX_FORWARDERS_TAG,
} from "@/lib/mxroute";

describe("MXroute cache policy", () => {
  it("uses the specified TTLs for domains and forwarders", () => {
    expect(DOMAINS_TTL_SECONDS).toBe(300);
    expect(FORWARDERS_TTL_SECONDS).toBe(60);
  });

  it("scopes forwarder tags per domain, case-insensitively", () => {
    expect(forwarderTag("Example.COM")).toBe(forwarderTag("example.com"));
    expect(forwarderTag("example.com")).not.toBe(forwarderTag("other.test"));
    expect(forwarderTag("example.com")).toContain(MX_FORWARDERS_TAG);
    expect(MX_DOMAINS_TAG).not.toBe(MX_FORWARDERS_TAG);
  });
});
