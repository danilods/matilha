import { select, isCancel, type Option } from "@clack/prompts";

export type PickOption<T> = {
  value: T;
  label: string;
  detail?: string;
};

export type PickGroup<T> = {
  title: string;
  options: PickOption<T>[];
};

export type PickArgs<T> = {
  message: string;
  groups: PickGroup<T>[];
  hint?: string;
};

type ClackOption<T> = {
  value: T | null;
  label: string;
  hint?: string;
};

export async function pick<T>(args: PickArgs<T>): Promise<T> {
  const { message, groups, hint } = args;

  if (groups.length === 0 || groups.every((g) => g.options.length === 0)) {
    throw new Error("pick: no options available");
  }

  const flat: ClackOption<T>[] = [];
  for (const group of groups) {
    if (group.options.length === 0) continue;
    flat.push({
      value: null,
      label: `── ${group.title} ─`
    });
    for (const opt of group.options) {
      flat.push({
        value: opt.value,
        label: opt.label,
        hint: opt.detail
      });
    }
  }

  const fullMessage = hint ? `${message} (${hint})` : message;

  const selected = await select({
    message: fullMessage,
    options: flat as unknown as Option<T>[]
  });

  if (isCancel(selected)) {
    throw new Error("pick: cancelled by user");
  }

  return selected as T;
}
