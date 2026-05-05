import { describe, it, expect, vi } from "vitest";
import {
  parseGateKeysFromMethodology,
  fetchMethodologyGateKeys,
  warnIfGatesDrift
} from "../../src/util/methodologyGates";
import { RegistryClient } from "../../src/registry/registryClient";

const FIXTURE_10_PRD = `# 10 — PRD

## Entry Gates

- [ ] Problem identified

## Exit Gates

- [ ] Single markdown SSoT
- [ ] Functional requirements enumerated
- [ ] Non-functional requirements cover performance, security, availability
- [ ] Persona(s) consolidated
- [ ] Risks listed

## Next section
body
`;

describe("parseGateKeysFromMethodology", () => {
  it("extracts bullet count from Exit Gates section", () => {
    const gates = parseGateKeysFromMethodology(FIXTURE_10_PRD);
    expect(gates.length).toBe(5);
  });

  it("returns empty array when section missing", () => {
    const gates = parseGateKeysFromMethodology("# No gates here\nbody");
    expect(gates).toEqual([]);
  });

  it("keeps legacy Portuguese headings supported", () => {
    const legacyPortuguese = FIXTURE_10_PRD.replace("Exit Gates", "Gates de saída");
    const gates = parseGateKeysFromMethodology(legacyPortuguese);
    expect(gates.length).toBe(5);
  });

  it("handles legacy Portuguese accent variations", () => {
    const legacyPortuguese = FIXTURE_10_PRD.replace("Exit Gates", "Gates de saida");
    const gates = parseGateKeysFromMethodology(legacyPortuguese);
    expect(gates.length).toBe(5);
  });
});

describe("fetchMethodologyGateKeys", () => {
  it("returns parsed keys on successful fetch", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response(FIXTURE_10_PRD, { status: 200 })
    );
    const gates = await fetchMethodologyGateKeys(10, client);
    expect(gates?.length).toBe(5);
  });

  it("returns null on fetch failure", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response("", { status: 500 })
    );
    const gates = await fetchMethodologyGateKeys(10, client);
    expect(gates).toBeNull();
  });
});

describe("warnIfGatesDrift", () => {
  it("does NOT warn when count matches hardcoded", async () => {
    // Hardcoded phase 20 has 6 gates; fixture with 6 bullets should not warn
    const fixture = `## Exit Gates
- [ ] a
- [ ] b
- [ ] c
- [ ] d
- [ ] e
- [ ] f
`;
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response(fixture, { status: 200 })
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await warnIfGatesDrift(20, client);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("warns when count drifts from hardcoded", async () => {
    // Phase 20 hardcoded has 6; fixture with 3 should warn
    const fixture = `## Exit Gates
- [ ] a
- [ ] b
- [ ] c
`;
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response(fixture, { status: 200 })
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await warnIfGatesDrift(20, client);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("stays silent on fetch failure", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response("", { status: 500 })
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await warnIfGatesDrift(10, client);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
