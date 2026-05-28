import path from "node:path";
import type {
  Diagnostic,
  GateResult,
  JsonReport,
  JsonReportProjectEntry,
  JsonReportSummary,
  PluginConfig,
  ScanOutcome,
  StatusPayload,
} from "./types.js";

const severityRank = (diagnostic: Diagnostic): number => (diagnostic.severity === "error" ? 0 : 1);

const bySeverityAndLocation = (a: Diagnostic, b: Diagnostic): number => {
  const severityDelta = severityRank(a) - severityRank(b);
  if (severityDelta !== 0) return severityDelta;
  const fileDelta = a.filePath.localeCompare(b.filePath);
  if (fileDelta !== 0) return fileDelta;
  return a.line - b.line || a.column - b.column;
};

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const formatScore = (summary: JsonReportSummary): string =>
  summary.score === null
    ? "score unavailable"
    : `score ${summary.score}${summary.scoreLabel ? ` (${summary.scoreLabel})` : ""}`;

const formatCounts = (summary: JsonReportSummary): string =>
  [
    plural(summary.errorCount, "error"),
    plural(summary.warningCount, "warning"),
    `across ${plural(summary.affectedFileCount, "file")}`,
  ].join(", ");

const formatLocation = (diagnostic: Diagnostic): string => {
  const relativePath = path.relative(process.cwd(), diagnostic.filePath) || diagnostic.filePath;
  return `${relativePath}:${diagnostic.line}:${diagnostic.column}`;
};

const formatDiagnostic = (diagnostic: Diagnostic): string =>
  `- ${diagnostic.severity} ${diagnostic.plugin}/${diagnostic.rule} at ${formatLocation(
    diagnostic,
  )}: ${diagnostic.message}`;

const formatSkippedChecks = (projects: readonly JsonReportProjectEntry[]): string[] =>
  projects.flatMap((project) => {
    if (project.skippedChecks.length === 0) return [];
    const reasons = project.skippedCheckReasons ?? {};
    return project.skippedChecks.map((check) => {
      const reason = reasons[check];
      return `- ${project.project.projectName}: ${check}${reason ? ` (${reason})` : ""}`;
    });
  });

const formatProjectSummary = (projects: readonly JsonReportProjectEntry[]): string[] =>
  projects.map((project) => {
    const framework = project.project.framework === "unknown" ? "React" : project.project.framework;
    const score = project.score === null ? "score unavailable" : `score ${project.score.score}`;
    return `- ${project.project.projectName}: ${framework}, ${plural(
      project.project.sourceFileCount,
      "source file",
    )}, ${score}`;
  });

const buildCompletedText = (
  report: JsonReport,
  outcome: ScanOutcome,
  config: PluginConfig,
): string => {
  const diagnostics = [...report.diagnostics].sort(bySeverityAndLocation);
  const topDiagnostics = diagnostics.slice(0, config.maxFindings);
  const omittedCount = Math.max(0, diagnostics.length - topDiagnostics.length);
  const skippedChecks = formatSkippedChecks(report.projects);
  const lines = [
    `React Doctor scanned ${plural(report.projects.length, "project")} in ${Math.round(
      report.elapsedMilliseconds,
    )}ms.`,
    "",
    "Projects:",
    ...formatProjectSummary(report.projects),
  ];

  if (outcome.skippedProjects.length > 0) {
    lines.push("", "Skipped projects:");
    lines.push(
      ...outcome.skippedProjects.map((project) => `- ${project.directory}: ${project.reason}`),
    );
  }

  if (skippedChecks.length > 0) {
    lines.push("", "Skipped checks:");
    lines.push(...skippedChecks);
  }

  if (topDiagnostics.length > 0) {
    lines.push("", `Top findings (${topDiagnostics.length} of ${diagnostics.length}):`);
    lines.push(...topDiagnostics.map(formatDiagnostic));
    if (omittedCount > 0) lines.push(`- ${plural(omittedCount, "additional finding")} omitted`);
  } else {
    lines.push("", "No diagnostics found.");
  }

  return lines.join("\n");
};

export function formatStatus(
  outcome: ScanOutcome,
  gate: GateResult,
  config: PluginConfig,
): StatusPayload {
  if (outcome.status === "skipped") {
    return {
      extraData: [{ skippedProjects: outcome.skippedProjects, status: "skipped" }],
      summary: "React Doctor skipped because no React project was detected.",
      text: outcome.reason,
      title: "React Doctor",
    };
  }

  const { report } = outcome;
  const status = gate.shouldFail ? "failed" : "passed";
  const summary = `React Doctor ${status}: ${formatScore(report.summary)}, ${formatCounts(
    report.summary,
  )}`;

  return {
    extraData: [
      {
        diagnostics: [...report.diagnostics]
          .sort(bySeverityAndLocation)
          .slice(0, config.maxFindings),
        failOn: gate.failOn,
        projects: report.projects.map((project) => ({
          directory: project.directory,
          framework: project.project.framework,
          name: project.project.projectName,
          score: project.score,
          skippedChecks: project.skippedChecks,
          sourceFileCount: project.project.sourceFileCount,
        })),
        skippedProjects: outcome.skippedProjects,
        status,
        summary: report.summary,
      },
    ],
    summary,
    text: buildCompletedText(report, outcome, config),
    title: "React Doctor",
  };
}
