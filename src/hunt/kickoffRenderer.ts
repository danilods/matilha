// src/hunt/kickoffRenderer.ts
import type { ParsedSP } from "./planParser";

export type KickoffContext = {
  feature_slug: string;
  wave_num: number;
  wave_id: string;
  sp: ParsedSP;
  worktree_path: string;
  branch_name: string;
  main_repo_path: string;
  superpowers_detected: boolean;
};

function padWave(n: number): string {
  return n.toString().padStart(2, "0");
}

function renderChecklist(items: string[]): string {
  return items.map((i) => `- [ ] ${i}`).join("\n");
}

function renderBullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

function substituteMustache(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
  }
  return out;
}

function resolveConditionals(template: string, flag: boolean, key: string): string {
  const ifRe = new RegExp(`\\{\\{#if ${key}\\}\\}([\\s\\S]*?)\\{\\{else\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}`, "g");
  return template.replace(ifRe, (_m, ifBlock, elseBlock) => (flag ? ifBlock : elseBlock));
}

export function renderKickoff(template: string, ctx: KickoffContext): string {
  let out = template;
  out = resolveConditionals(out, ctx.superpowers_detected, "superpowers_detected");
  out = substituteMustache(out, {
    feature_slug: ctx.feature_slug,
    wave_num_padded: padWave(ctx.wave_num),
    wave_id: ctx.wave_id,
    sp_id: ctx.sp.id,
    sp_title: ctx.sp.title,
    sp_description: ctx.sp.description,
    acceptance_checklist: renderChecklist(ctx.sp.acceptance),
    touches_list: renderBullets(ctx.sp.touches),
    tests_list: ctx.sp.tests.length > 0 ? renderBullets(ctx.sp.tests) : "_(none)_",
    worktree_path: ctx.worktree_path,
    branch_name: ctx.branch_name,
    main_repo_path: ctx.main_repo_path
  });
  return out;
}

export type SPDoneContext = {
  feature_slug: string;
  wave_id: string;
  sp_id: string;
};

export function renderSPDone(template: string, ctx: SPDoneContext): string {
  return substituteMustache(template, {
    feature_slug: ctx.feature_slug,
    wave_id: ctx.wave_id,
    sp_id: ctx.sp_id
  });
}
