// src/hunt/dispatcher.ts
import type { ParsedSP } from "./planParser";

export type CompanionsState = {
  superpowers: boolean;
};

export type DispatchContext = {
  sp: ParsedSP;
  worktreePath: string;
  branchName: string;
  kickoffPath: string;
  companions: CompanionsState;
};

export type DispatchReport = {
  sp_id: string;
  command: string;
  session_id: string | null;
};

export interface Dispatcher {
  dispatch(ctx: DispatchContext): Promise<DispatchReport>;
}

export class PrintDispatcher implements Dispatcher {
  async dispatch(ctx: DispatchContext): Promise<DispatchReport> {
    const command = `cd ${ctx.worktreePath} && $EDITOR kickoff.md`;
    return {
      sp_id: ctx.sp.id,
      command,
      session_id: null
    };
  }
}
