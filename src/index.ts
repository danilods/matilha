import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const _pkg = _require("../package.json") as { version: string };
export const VERSION: string = _pkg.version;
