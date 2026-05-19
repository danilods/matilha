import { describe, it, expect } from "vitest";
import { markdownToAdf } from "../../src/jira/adf";

describe("markdownToAdf", () => {
  it("converts simple markdown into Jira ADF paragraphs and bullet lists", () => {
    const adf = markdownToAdf("Build auth\n\n- login\n- logout");

    expect(adf.type).toBe("doc");
    expect(adf.version).toBe(1);
    expect(adf.content[0]?.type).toBe("paragraph");
    expect(adf.content[1]?.type).toBe("bulletList");
  });
});
