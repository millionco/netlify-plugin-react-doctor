import { describe, expect, it } from "vitest";
import { formatBuildFailureMessage, formatStatus } from "../src/format.js";
import type { Diagnostic, GateResult, PluginConfig, ScanOutcome } from "../src/types.js";

const config: PluginConfig = {
  deadCode: true,
  directory: ".",
  failOn: "error",
  lint: true,
  maxFindings: 1,
  noScore: false,
  projects: [],
  respectInlineDisables: true,
  skipWithoutReact: true,
  verbose: false,
};

const diagnostic = (severity: Diagnostic["severity"], rule: string): Diagnostic => ({
  category: "Performance",
  column: 3,
  filePath: `${process.cwd()}/src/App.tsx`,
  help: "Use a stable value.",
  line: 2,
  message: "Avoid this React pattern.",
  plugin: "react-doctor",
  rule,
  severity,
});

const outcome: ScanOutcome = {
  diagnostics: [diagnostic("warning", "warn-rule"), diagnostic("error", "error-rule")],
  report: {
    diagnostics: [diagnostic("warning", "warn-rule"), diagnostic("error", "error-rule")],
    diff: null,
    directory: ".",
    elapsedMilliseconds: 12,
    error: null,
    mode: "full",
    ok: true,
    projects: [
      {
        diagnostics: [],
        directory: ".",
        elapsedMilliseconds: 12,
        project: {
          framework: "vite",
          hasReactCompiler: false,
          hasReactNativeWorkspace: false,
          hasTanStackQuery: false,
          hasTypeScript: true,
          projectName: "fixture",
          reactMajorVersion: 19,
          reactVersion: "19.0.0",
          rootDirectory: ".",
          sourceFileCount: 3,
          tailwindVersion: null,
        },
        score: { label: "Good", score: 88 },
        skippedChecks: [],
      },
    ],
    schemaVersion: 1,
    summary: {
      affectedFileCount: 1,
      errorCount: 1,
      score: 88,
      scoreLabel: "Good",
      totalDiagnosticCount: 2,
      warningCount: 1,
    },
    version: "test",
  },
  skippedProjects: [],
  status: "completed",
};

describe("formatStatus", () => {
  it("builds a concise deploy summary with capped diagnostic details", () => {
    const status = formatStatus(
      outcome,
      {
        failOn: "error",
        failingDiagnostics: [diagnostic("error", "error-rule")],
        shouldFail: true,
      },
      config,
    );

    expect(status.summary).toContain("React Doctor failed");
    expect(status.summary).toContain("score 88");
    expect(status.text).toContain("Top findings (1 of 2)");
    expect(status.text).toContain("error-rule");
    expect(status.text).toContain("1 additional finding omitted");
    expect(status.extraData).toMatchObject([
      {
        failOn: "error",
        status: "failed",
      },
    ]);
  });

  it("formats blocking failure messages", () => {
    const gate: GateResult = {
      failOn: "warning",
      failingDiagnostics: [diagnostic("warning", "warn-rule")],
      shouldFail: true,
    };

    expect(formatBuildFailureMessage(gate)).toContain("fail_on=warning");
  });
});
