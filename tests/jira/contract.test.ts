import { describe, it, expect } from "vitest";
import {
  parseJiraTaskContract,
  toJiraCreatePayloads
} from "../../src/jira/contract";

describe("Jira task contract", () => {
  const valid = {
    schema_version: 1,
    project_key: "MAT",
    defaults: {
      issue_type: "Task",
      labels: ["matilha", "ai-assisted"],
      story_points_field: "customfield_10016"
    },
    tasks: [
      {
        external_id: "feat-auth-SP1",
        summary: "Implement login flow",
        description_markdown: "Build login, logout, and session validation.",
        story_points: 0.5,
        source: {
          spec: "docs/matilha/specs/feat-auth-spec.md",
          plan: "docs/matilha/plans/feat-auth-plan.md",
          sp: "SP1"
        },
        comments: [
          { body_markdown: "Created from Matilha wave 1." }
        ],
        worklogs: [
          { time_spent: "30m", comment_markdown: "AI-assisted implementation time." }
        ]
      }
    ]
  };

  it("parses a valid v1 task contract", () => {
    const contract = parseJiraTaskContract(valid);

    expect(contract.project_key).toBe("MAT");
    expect(contract.tasks[0]?.external_id).toBe("feat-auth-SP1");
  });

  it("rejects duplicate external_id values", () => {
    const duplicated = {
      ...valid,
      tasks: [valid.tasks[0], { ...valid.tasks[0], summary: "Duplicate" }]
    };

    expect(() => parseJiraTaskContract(duplicated)).toThrow(/duplicate external_id/i);
  });

  it("converts tasks into Jira create payloads with labels, ADF, story points, and external id property", () => {
    const payloads = toJiraCreatePayloads(parseJiraTaskContract(valid));

    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.externalId).toBe("feat-auth-SP1");
    expect(payloads[0]?.fields.summary).toBe("Implement login flow");
    expect(payloads[0]?.fields.labels).toContain("matilha");
    expect(payloads[0]?.fields.customfield_10016).toBe(0.5);
    expect(payloads[0]?.properties["matilha.external_id"]).toEqual({
      external_id: "feat-auth-SP1"
    });
  });

  it("converts a full 100-task spec/plan batch without dropping work items", () => {
    const batch = {
      ...valid,
      tasks: Array.from({ length: 100 }, (_, index) => ({
        external_id: `bulk-SP${index + 1}`,
        summary: `Implement spec task ${index + 1}`,
        description_markdown: `Task ${index + 1} generated from the accepted Matilha spec and plan.`,
        story_points: 0.25,
        source: {
          spec: "docs/matilha/specs/bulk-spec.md",
          plan: "docs/matilha/plans/bulk-plan.md",
          sp: `SP${index + 1}`
        }
      }))
    };

    const payloads = toJiraCreatePayloads(parseJiraTaskContract(batch));

    expect(payloads).toHaveLength(100);
    expect(payloads[0]?.externalId).toBe("bulk-SP1");
    expect(payloads[99]?.externalId).toBe("bulk-SP100");
    expect(payloads.every((payload) => payload.fields.project.key === "MAT")).toBe(true);
  });
});
