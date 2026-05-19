import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  jiraApplyCommand,
  jiraCreateCommand,
  jiraInitCommand,
  jiraPreviewCommand,
  jiraSyncCommand,
  jiraValidateCommand
} from "../../src/jira/jiraCommand";
import { MatilhaUserError } from "../../src/ui/errorFormat";

describe("jiraCreateCommand", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let logs: string[];

  beforeEach(() => {
    logs = [];
    logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
      logs.push(typeof msg === "string" ? msg : JSON.stringify(msg));
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("prints a create-issue dry-run payload without requiring Jira credentials", async () => {
    await jiraCreateCommand({
      summary: "Implement login",
      description: "Build auth\n\n- login\n- logout",
      type: "Task",
      points: "0.5",
      project: "MAT",
      dryRun: true
    });

    const out = logs.join("\n");
    expect(out).toContain("dry-run");
    expect(out).toContain("Implement login");
    expect(out).toContain("customfield");
    expect(out).toContain("0.5");
  });
});

describe("controlled Jira JSON flow", () => {
  let tmp: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let logs: string[];

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-jira-"));
    logs = [];
    logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
      logs.push(typeof msg === "string" ? msg : JSON.stringify(msg));
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function writeContract(): string {
    const path = join(tmp, "jira-tasks.json");
    writeFileSync(path, JSON.stringify({
      schema_version: 1,
      project_key: "MAT",
      defaults: {
        labels: ["matilha"],
        story_points_field: "customfield_10016"
      },
      tasks: [
        {
          external_id: "feat-auth-SP1",
          summary: "Implement login",
          description_markdown: "Build login.",
          story_points: 0.5
        }
      ]
    }, null, 2), "utf-8");
    return path;
  }

  it("init writes a local Jira skill and example contract", async () => {
    mkdirSync(join(tmp, ".cursor"), { recursive: true });

    await jiraInitCommand(tmp, { dryRun: false });

    expect(existsSync(join(tmp, ".agents", "skills", "matilha-jira", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmp, ".cursor", "skills", "matilha-jira", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmp, "docs", "matilha", "jira", "tasks.example.json"))).toBe(true);
    expect(existsSync(join(tmp, "docs", "matilha", "jira", "tutorial.md"))).toBe(true);
    const skill = readFileSync(join(tmp, ".agents", "skills", "matilha-jira", "SKILL.md"), "utf-8");
    const tutorial = readFileSync(join(tmp, "docs", "matilha", "jira", "tutorial.md"), "utf-8");
    expect(skill).toContain("matilha jira preview");
    expect(skill).toContain("Generate tasks from specs and plans");
    expect(skill).toContain("100 tasks");
    expect(tutorial).toContain("From Spec/Plan To 100 Tasks");
    expect(tutorial).toContain("generic work item");
  });

  it("validate confirms a valid contract", async () => {
    const path = writeContract();

    await jiraValidateCommand(path);

    expect(logs.join("\n")).toContain("valid");
  });

  it("preview prints the controlled execution plan without Jira credentials", async () => {
    const path = writeContract();

    await jiraPreviewCommand(path);

    const out = logs.join("\n");
    expect(out).toContain("1 task(s) ready");
    expect(out).toContain("feat-auth-SP1");
    expect(out).toContain("Implement login");
    expect(out).toContain("customfield_10016");
  });

  it("preview makes large batches explicit without dumping the converted payload", async () => {
    const path = join(tmp, "jira-100-tasks.json");
    writeFileSync(path, JSON.stringify({
      schema_version: 1,
      project_key: "MAT",
      defaults: {
        labels: ["matilha", "bulk-import"],
        story_points_field: "customfield_10016"
      },
      tasks: Array.from({ length: 100 }, (_, index) => ({
        external_id: `bulk-SP${index + 1}`,
        summary: `Implement bulk task ${index + 1}`,
        description_markdown: `Generated from spec item ${index + 1}.`,
        story_points: 0.25,
        source: {
          spec: "docs/matilha/specs/bulk-spec.md",
          plan: "docs/matilha/plans/bulk-plan.md",
          sp: `SP${index + 1}`
        }
      }))
    }, null, 2), "utf-8");

    await jiraPreviewCommand(path);

    const out = logs.join("\n");
    expect(out).toContain("100 task(s) ready");
    expect(out).toContain("bulk-SP1");
    expect(out).toContain("bulk-SP100");
    expect(out).toContain("converted Jira payload omitted for large batch");
  });

  it("apply refuses mutation unless --yes is provided", async () => {
    const path = writeContract();

    await expect(jiraApplyCommand(path, { yes: false })).rejects.toBeInstanceOf(MatilhaUserError);
  });

  it("apply stores the external_id to Jira key map after creating issues", async () => {
    const path = writeContract();
    vi.stubEnv("JIRA_BASE_URL", "https://example.atlassian.net");
    vi.stubEnv("JIRA_EMAIL", "bot@example.com");
    vi.stubEnv("JIRA_API_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/rest/api/3/issue") && init.method === "POST") {
        return new Response(JSON.stringify({ key: "MAT-123" }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }));

    await jiraApplyCommand(path, { yes: true, cwd: tmp });

    const map = JSON.parse(readFileSync(join(tmp, "docs", "matilha", "jira", "issues.map.json"), "utf-8"));
    expect(map.issues["feat-auth-SP1"].jira_key).toBe("MAT-123");
  });

  it("sync previews pending completion events without calling Jira", async () => {
    writeIssueMap(tmp);
    writeCompletionEvent(tmp, "feat-auth-SP1");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await jiraSyncCommand(tmp, { preview: true });

    const out = logs.join("\n");
    expect(out).toContain("matilha jira sync preview");
    expect(out).toContain("feat-auth-SP1");
    expect(out).toContain("MAT-123");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readdirSync(join(tmp, "docs", "matilha", "events", "outbox"))).toHaveLength(1);
  });

  it("sync applies comments, worklogs, story points, properties, and moves processed events", async () => {
    writeIssueMap(tmp);
    writeCompletionEvent(tmp, "feat-auth-SP1");
    vi.stubEnv("JIRA_BASE_URL", "https://example.atlassian.net");
    vi.stubEnv("JIRA_EMAIL", "bot@example.com");
    vi.stubEnv("JIRA_API_TOKEN", "token");
    vi.stubEnv("JIRA_PROJECT_KEY", "MAT");
    vi.stubEnv("JIRA_STORY_POINTS_FIELD", "customfield_10016");
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }));

    await jiraSyncCommand(tmp, { yes: true });

    expect(calls.some((call) => call.url.endsWith("/rest/api/3/issue/MAT-123/comment"))).toBe(true);
    expect(calls.some((call) => call.url.endsWith("/rest/api/3/issue/MAT-123/worklog"))).toBe(true);
    expect(calls.some((call) => call.url.endsWith("/rest/api/3/issue/MAT-123") && call.init.method === "PUT")).toBe(true);
    expect(calls.some((call) => call.url.endsWith("/rest/api/3/issue/MAT-123/properties/matilha.last_event"))).toBe(true);
    expect(readdirSync(join(tmp, "docs", "matilha", "events", "outbox"))).toHaveLength(0);
    expect(readdirSync(join(tmp, "docs", "matilha", "events", "processed"))).toHaveLength(1);
    const map = JSON.parse(readFileSync(join(tmp, "docs", "matilha", "jira", "issues.map.json"), "utf-8"));
    expect(map.issues["feat-auth-SP1"].last_synced_at).toBeTruthy();
  });
});

function writeIssueMap(cwd: string): void {
  const path = join(cwd, "docs", "matilha", "jira", "issues.map.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({
    schema_version: 1,
    issues: {
      "feat-auth-SP1": {
        jira_key: "MAT-123",
        created_at: "2026-05-19T03:00:00.000Z"
      }
    }
  }, null, 2), "utf-8");
}

function writeCompletionEvent(cwd: string, externalId: string): void {
  const path = join(cwd, "docs", "matilha", "events", "outbox", "task-completed-feat-auth-SP1.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({
    schema_version: 1,
    event: "task.completed",
    id: "task.completed:feat-auth:SP1:2026-05-19T03:00:00Z",
    created_at: "2026-05-19T03:00:00.000Z",
    external_id: externalId,
    source: {
      feature: "feat-auth",
      wave: "w1",
      sp: "SP1",
      plan: "docs/matilha/plans/feat-auth-plan.md"
    },
    result: {
      status: "completed",
      story_points: 0.25,
      worklog: "15m",
      comment_markdown: "Merged, tested, and reviewed.",
      evidence: ["SP-DONE.md", "regression passed"]
    }
  }, null, 2), "utf-8");
}
