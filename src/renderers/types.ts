export type Provider =
  | "universal"
  | "claude-code"
  | "cursor"
  | "codex"
  | "gemini-cli";

export interface ProviderFile {
  provider: Provider;
  relativePath: string;
  content: string;
}

export interface MatilhaSkillInput {
  name: string;
  description: string;
  phase: string;
  version: string;
  requires: string[];
  optionalCompanions: string[];

  mission: string;
  sorReference: string[];
  preconditions: string[];
  executionWorkflow: string[];
  rulesDo: string[];
  rulesDont: string[];
  expectedBehavior: string[];
  qualityGates: string[];
  companionIntegration: string[];
  outputArtifacts: string[];
  exampleConstraintLanguage: string[];
  troubleshooting: string[];
}

export interface SkillMetadata {
  name: string;
  description: string;
  author?: string;
  license?: string;
}
