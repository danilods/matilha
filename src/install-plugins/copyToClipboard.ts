import { spawn } from "node:child_process";
import { platform } from "node:os";

export type ClipboardMethod = "pbcopy" | "xclip" | "clip" | "none";

export type CopyResult = {
  copied: boolean;
  method: ClipboardMethod;
};

/**
 * Pipe `text` to the platform clipboard binary.
 *
 * Detection order:
 *   - darwin  → pbcopy
 *   - win32   → clip.exe
 *   - others  → xclip (with -selection clipboard)
 *
 * Returns `{ copied: false, method: "none" }` if the binary is absent or the
 * child process fails to start / exits non-zero — caller should fall back to
 * printing the text to stdout.
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  const method = detectMethod();
  if (method === "none") {
    return { copied: false, method: "none" };
  }
  const { cmd, args } = commandFor(method);
  return new Promise<CopyResult>((resolve) => {
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
    } catch {
      resolve({ copied: false, method: "none" });
      return;
    }
    proc.on("error", () => resolve({ copied: false, method: "none" }));
    proc.on("exit", (code) => {
      if (code === 0) {
        resolve({ copied: true, method });
      } else {
        resolve({ copied: false, method: "none" });
      }
    });
    try {
      proc.stdin?.end(text);
    } catch {
      resolve({ copied: false, method: "none" });
    }
  });
}

function detectMethod(): ClipboardMethod {
  const p = platform();
  if (p === "darwin") return "pbcopy";
  if (p === "win32") return "clip";
  return "xclip";
}

function commandFor(method: ClipboardMethod): { cmd: string; args: string[] } {
  switch (method) {
    case "pbcopy":
      return { cmd: "pbcopy", args: [] };
    case "xclip":
      return { cmd: "xclip", args: ["-selection", "clipboard"] };
    case "clip":
      return { cmd: "clip", args: [] };
    default:
      return { cmd: "true", args: [] };
  }
}
