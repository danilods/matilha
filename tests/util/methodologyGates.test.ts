import { describe, it, expect, vi } from "vitest";
import {
  parseGateKeysFromMethodology,
  fetchMethodologyGateKeys,
  warnIfGatesDrift
} from "../../src/util/methodologyGates";
import { RegistryClient } from "../../src/registry/registryClient";

const FIXTURE_10_PRD = `# 10 — PRD

## Gates de entrada

- [ ] Problema identificado

## Gates de saída (binários — só passe adiante quando todos estiverem atendidos)

- [ ] SSoT em markdown único
- [ ] RFs enumerados
- [ ] RNFs cobrem performance, segurança, disponibilidade
- [ ] Persona(s) consolidada(s)
- [ ] Riscos listados

## Next section
body
`;

describe("parseGateKeysFromMethodology", () => {
  it("extracts bullet count from Gates de saída section", () => {
    const gates = parseGateKeysFromMethodology(FIXTURE_10_PRD);
    expect(gates.length).toBe(5);
  });

  it("returns empty array when section missing", () => {
    const gates = parseGateKeysFromMethodology("# No gates here\nbody");
    expect(gates).toEqual([]);
  });

  it("handles accent variations (Gates de saida / saída)", () => {
    const withoutAccent = FIXTURE_10_PRD.replace("saída", "saida");
    const gates = parseGateKeysFromMethodology(withoutAccent);
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
    const fixture = `## Gates de saída
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
    const fixture = `## Gates de saída
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
