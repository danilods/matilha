import { describe, it, expect } from "vitest";
import { parseJiraTaskContract, toJiraCreatePayloads } from "../../src/jira/contract";

describe("Jira contract taxonomy fields", () => {
  const base = {
    schema_version: 1 as const,
    project_key: "BOIAA",
    tasks: [
      {
        external_id: "argos-fase2.0-T3",
        summary: "AdminLayout — shell de navegacao",
        description_markdown: "shell de navegacao das 5 areas admin",
        category: "frontend",
        issue_kind: "foundation" as const,
        phase: { matilha: 40, argos: "2.0" }
      }
    ]
  };

  it("accepts category, issue_kind and phase on a task", () => {
    const contract = parseJiraTaskContract(base);
    expect(contract.tasks[0]!.category).toBe("frontend");
    expect(contract.tasks[0]!.issue_kind).toBe("foundation");
    expect(contract.tasks[0]!.phase).toEqual({ matilha: 40, argos: "2.0" });
  });

  it("rejects an issue_kind outside the allowed enum", () => {
    expect(() =>
      parseJiraTaskContract({
        ...base,
        tasks: [{ ...base.tasks[0], issue_kind: "epic" }]
      })
    ).toThrow();
  });

  it("carries taxonomy into the matilha.taxonomy issue property and labels", () => {
    const payload = toJiraCreatePayloads(parseJiraTaskContract(base))[0]!;
    expect(payload.properties["matilha.taxonomy"]).toEqual({
      category: "frontend",
      issue_kind: "foundation",
      phase: { matilha: 40, argos: "2.0" }
    });
    expect(payload.fields.labels).toContain("frontend");
  });
});
