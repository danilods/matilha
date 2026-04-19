// tests/hunt/planParser.test.ts
import { describe, it, expect } from "vitest";
import { parsePlan } from "../../src/hunt/planParser";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const sample = `---
name: feat-auth
spec: ../specs/feat-auth-spec.md
created: "2026-04-20"
waves:
  w1:
    - SP1
    - SP2
  w2:
    - SP3
---

# Feat Auth — Execution Plan

## Wave 1

### SP1 — Database schema for users
This SP sets up the initial users table with email and password hash.

**Acceptance**
- [ ] users table created
- [ ] migration runs clean

**Touches**
- migrations/001_users.sql
- src/db/schema.ts

**Tests**
- tests/db/schema.test.ts

### SP2 — Session token generator
Short description here.

**Acceptance**
- [ ] tokens are unique
- [ ] TTL configurable

**Touches**
- src/auth/tokens.ts

**Tests**
- tests/auth/tokens.test.ts

## Wave 2

### SP3 — Login endpoint
Wires it all together.

**Acceptance**
- [ ] POST /login returns 200 with token

**Touches**
- src/routes/login.ts
- src/routes/index.ts

**Tests**
- tests/routes/login.test.ts
`;

describe("parsePlan", () => {
  it("parses frontmatter waves + body SPs into structured shape", () => {
    const result = parsePlan(sample);
    expect(result.name).toBe("feat-auth");
    expect(result.waves).toHaveLength(2);
    expect(result.waves[0].id).toBe("w1");
    expect(result.waves[0].sps).toHaveLength(2);
    expect(result.waves[0].sps[0].id).toBe("SP1");
    expect(result.waves[0].sps[0].title).toBe("Database schema for users");
    expect(result.waves[0].sps[0].touches).toEqual(["migrations/001_users.sql", "src/db/schema.ts"]);
    expect(result.waves[0].sps[0].acceptance).toHaveLength(2);
    expect(result.waves[0].sps[0].tests).toEqual(["tests/db/schema.test.ts"]);
  });

  it("accepts em-dash separator (canonical)", () => {
    const sp = sample.replace("SP1 — Database", "SP1 — Database");
    const r = parsePlan(sp);
    expect(r.waves[0].sps[0].title).toBe("Database schema for users");
  });

  it("soft-strict: accepts colon separator with warning", () => {
    const variant = sample.replace("### SP1 — Database schema for users", "### SP1: Database schema for users");
    const result = parsePlan(variant);
    expect(result.waves[0].sps[0].title).toBe("Database schema for users");
    expect(result.warnings.some((w) => w.includes("colon"))).toBe(true);
  });

  it("soft-strict: accepts single hyphen separator with warning", () => {
    const variant = sample.replace("### SP1 — Database schema for users", "### SP1 - Database schema for users");
    const result = parsePlan(variant);
    expect(result.waves[0].sps[0].title).toBe("Database schema for users");
    expect(result.warnings.some((w) => w.toLowerCase().includes("hyphen"))).toBe(true);
  });

  it("hard-error on unrecognized SP heading", () => {
    const broken = sample.replace("### SP1 — Database schema for users", "### Step 1 Database");
    expect(() => parsePlan(broken)).toThrow(MatilhaUserError);
  });

  it("hard-error on missing Touches block", () => {
    const noTouches = sample.replace(/\*\*Touches\*\*\n- migrations\/001_users\.sql\n- src\/db\/schema\.ts\n\n/, "");
    expect(() => parsePlan(noTouches)).toThrow(MatilhaUserError);
  });

  it("hard-error on SP in frontmatter but missing in body", () => {
    const withOrphan = sample.replace("    - SP1\n    - SP2", "    - SP1\n    - SP2\n    - SP99");
    expect(() => parsePlan(withOrphan)).toThrow(MatilhaUserError);
  });

  it("hard-error on SP heading in body not declared in frontmatter", () => {
    const extra = sample + "\n### SP42 — Orphan\n\n**Acceptance**\n- [ ] x\n\n**Touches**\n- x.ts\n";
    expect(() => parsePlan(extra)).toThrow(MatilhaUserError);
  });

  it("strips uppercase [X] checkbox prefix from bullets", () => {
    const plan = `---
name: test-uppercase
spec: ../specs/test.md
created: "2026-04-18"
waves:
  w1:
    - SP1
---

## Wave 1

### SP1 — Minimal SP

**Acceptance**
- [X] criterion

**Touches**
- src/foo.ts
`;
    const result = parsePlan(plan);
    expect(result.waves[0]!.sps[0]!.acceptance[0]).toBe("criterion");
  });
});
