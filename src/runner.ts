import {
  diagnose,
  isReactDoctorError,
  summarizeDiagnostics,
  type DiagnoseResult,
  type Diagnostic,
  type JsonReport,
  type JsonReportProjectEntry,
  type ScoreResult,
} from "react-doctor/api";
import type { PluginConfig, ScanOutcome, SkippedProject } from "./types.js";

const REPORT_VERSION = "react-doctor@0.2.9";

type ProjectResult =
  | {
      readonly directory: string;
      readonly ok: true;
      readonly result: DiagnoseResult;
    }
  | {
      readonly directory: string;
      readonly error: unknown;
      readonly ok: false;
    };

const skippableDiscoveryErrorNames = new Set([
  "NoReactDependencyError",
  "PackageJsonNotFoundError",
]);

const errorName = (error: unknown): string | null => (error instanceof Error ? error.name : null);

const reactDoctorReasonTag = (error: unknown): string | null => {
  if (!isReactDoctorError(error)) return null;
  const reason = error.reason as { _tag?: unknown };
  return typeof reason._tag === "string" ? reason._tag : null;
};

export function isSkippableReactDoctorError(error: unknown): boolean {
  const name = errorName(error);
  if (name !== null && skippableDiscoveryErrorNames.has(name)) return true;
  return reactDoctorReasonTag(error) === "NoReactDependency";
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const withScorePreference = (result: DiagnoseResult, noScore: boolean): DiagnoseResult => ({
  ...result,
  score: noScore ? null : result.score,
});

const toProjectEntry = (directory: string, result: DiagnoseResult): JsonReportProjectEntry => ({
  diagnostics: result.diagnostics,
  directory,
  elapsedMilliseconds: result.elapsedMilliseconds,
  project: result.project,
  score: result.score,
  skippedChecks: result.skippedChecks,
  ...(result.skippedCheckReasons ? { skippedCheckReasons: result.skippedCheckReasons } : {}),
});

const findWorstScore = (entries: readonly JsonReportProjectEntry[]): ScoreResult | null => {
  let worstScore: ScoreResult | null = null;
  for (const entry of entries) {
    const score = entry.score;
    if (score === null) continue;
    if (worstScore === null || score.score < worstScore.score) worstScore = score;
  }
  return worstScore;
};

const buildReport = (
  directory: string,
  entries: readonly JsonReportProjectEntry[],
  elapsedMilliseconds: number,
): JsonReport => {
  const diagnostics = entries.flatMap((entry) => entry.diagnostics);
  const worstScore = findWorstScore(entries);

  return {
    diagnostics,
    diff: null,
    directory,
    elapsedMilliseconds,
    error: null,
    mode: "full",
    ok: true,
    projects: [...entries],
    schemaVersion: 1,
    summary: summarizeDiagnostics(
      diagnostics,
      worstScore?.score ?? null,
      worstScore?.label ?? null,
    ),
    version: REPORT_VERSION,
  };
};

const diagnoseOptions = (config: PluginConfig) => ({
  deadCode: config.deadCode,
  lint: config.lint,
  respectInlineDisables: config.respectInlineDisables,
  verbose: config.verbose,
});

const skippedOutcome = (skippedProjects: readonly SkippedProject[]): ScanOutcome => ({
  reason: skippedProjects.map((project) => project.reason).join("; "),
  skippedProjects,
  status: "skipped",
});

const handleProjectError = (
  project: ProjectResult,
  config: PluginConfig,
  skippedProjects: SkippedProject[],
): void => {
  if (project.ok) return;
  if (config.skipWithoutReact && isSkippableReactDoctorError(project.error)) {
    skippedProjects.push({
      directory: project.directory,
      reason: errorMessage(project.error),
    });
    return;
  }
  throw project.error;
};

const runSingleProject = async (config: PluginConfig): Promise<ScanOutcome> => {
  try {
    const result = withScorePreference(
      await diagnose(config.directory, diagnoseOptions(config)),
      config.noScore,
    );
    const entry = toProjectEntry(result.project.rootDirectory, result);
    const report = buildReport(config.directory, [entry], result.elapsedMilliseconds);

    return {
      diagnostics: report.diagnostics,
      report,
      skippedProjects: [],
      status: "completed",
    };
  } catch (error) {
    if (!config.skipWithoutReact || !isSkippableReactDoctorError(error)) throw error;
    return skippedOutcome([{ directory: config.directory, reason: errorMessage(error) }]);
  }
};

const runMultipleProjects = async (config: PluginConfig): Promise<ScanOutcome> => {
  const startTime = performance.now();
  const results: ProjectResult[] = await Promise.all(
    config.projects.map(async (directory) => {
      try {
        const result = await diagnose(directory, diagnoseOptions(config));
        return { directory, ok: true, result };
      } catch (error) {
        return { directory, error, ok: false };
      }
    }),
  );

  const skippedProjects: SkippedProject[] = [];
  const entries: JsonReportProjectEntry[] = [];

  for (const project of results) {
    handleProjectError(project, config, skippedProjects);
    if (!project.ok) continue;
    const projectResult = withScorePreference(project.result, config.noScore);
    entries.push(toProjectEntry(projectResult.project.rootDirectory, projectResult));
  }

  if (entries.length === 0) return skippedOutcome(skippedProjects);

  const report = buildReport(config.directory, entries, performance.now() - startTime);

  return {
    diagnostics: report.diagnostics as readonly Diagnostic[],
    report,
    skippedProjects,
    status: "completed",
  };
};

export async function runReactDoctor(config: PluginConfig): Promise<ScanOutcome> {
  if (config.projects.length > 0) return runMultipleProjects(config);
  return runSingleProject(config);
}
