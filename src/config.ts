import { z } from "zod";
import type { PluginConfig } from "./types.js";

const DEFAULT_MAX_FINDINGS = 20;

const booleanLike = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return value;
}, z.boolean());

const integerLike = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return value;
  return Number(value);
}, z.number().int().min(0));

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

const projectsLike = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed
        .split(",")
        .map((project) => project.trim())
        .filter(Boolean);
    }
  },
  z.array(z.string().min(1)).default([]),
);

const rawConfigSchema = z.object({
  dead_code: booleanLike.default(true),
  directory: z.string().min(1).default("."),
  fail_on: z.enum(["error", "warning", "none"]).default("error"),
  lint: booleanLike.default(true),
  max_findings: integerLike.default(DEFAULT_MAX_FINDINGS),
  no_score: booleanLike.default(false),
  output_path: optionalString,
  projects: projectsLike,
  respect_inline_disables: booleanLike.default(true),
  skip_without_react: booleanLike.default(true),
  verbose: booleanLike.default(false),
});

type RawConfig = Record<string, unknown>;

const envFallbacks = (env: NodeJS.ProcessEnv): RawConfig => ({
  dead_code: env.REACT_DOCTOR_DEAD_CODE,
  directory: env.REACT_DOCTOR_DIRECTORY,
  fail_on: env.REACT_DOCTOR_FAIL_ON,
  lint: env.REACT_DOCTOR_LINT,
  max_findings: env.REACT_DOCTOR_MAX_FINDINGS,
  no_score: env.REACT_DOCTOR_NO_SCORE,
  output_path: env.REACT_DOCTOR_OUTPUT_PATH,
  projects: env.REACT_DOCTOR_PROJECTS,
  respect_inline_disables: env.REACT_DOCTOR_RESPECT_INLINE_DISABLES,
  skip_without_react: env.REACT_DOCTOR_SKIP_WITHOUT_REACT,
  verbose: env.REACT_DOCTOR_VERBOSE,
});

const withoutUndefined = (input: RawConfig): RawConfig =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as RawConfig;

export function normalizeInputs(
  inputs: Record<string, unknown> = {},
  env: NodeJS.ProcessEnv = process.env,
): PluginConfig {
  const parsed = rawConfigSchema.parse({
    ...withoutUndefined(envFallbacks(env)),
    ...withoutUndefined(inputs as RawConfig),
  });

  return {
    deadCode: parsed.dead_code,
    directory: parsed.directory,
    failOn: parsed.fail_on,
    lint: parsed.lint,
    maxFindings: parsed.max_findings,
    noScore: parsed.no_score,
    outputPath: parsed.output_path,
    projects: parsed.projects,
    respectInlineDisables: parsed.respect_inline_disables,
    skipWithoutReact: parsed.skip_without_react,
    verbose: parsed.verbose,
  };
}
