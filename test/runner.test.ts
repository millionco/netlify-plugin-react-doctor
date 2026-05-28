import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiagnoseResult, Diagnostic } from "react-doctor/api";
import type { PluginConfig } from "../src/types.js";

const diagnoseMock = vi.hoisted(() => vi.fn());

vi.mock("react-doctor/api", () => ({
  diagnose: diagnoseMock,
  isReactDoctorError: () => false,
  summarizeDiagnostics: (
    diagnostics: Diagnostic[],
    score: number | null,
    label: string | null,
  ) => ({
    affectedFileCount: new Set(diagnostics.map((diagnostic) => diagnostic.filePath)).size,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    score,
    scoreLabel: label,
    totalDiagnosticCount: diagnostics.length,
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
  }),
}));

const { runReactDoctor } = await import("../src/runner.js");

const config: PluginConfig = {
  deadCode: true,
  directory: ".",
  failOn: "error",
  lint: true,
  maxFindings: 20,
  noScore: false,
  projects: [],
  respectInlineDisables: true,
  skipWithoutReact: true,
  verbose: false,
};

const diagnostic: Diagnostic = {
  category: "Correctness",
  column: 1,
  filePath: "src/App.tsx",
  help: "Fix it.",
  line: 1,
  message: "Bad React pattern.",
  plugin: "react-doctor",
  rule: "test-rule",
  severity: "error",
};

const diagnoseResult: DiagnoseResult = {
  diagnostics: [diagnostic],
  elapsedMilliseconds: 10,
  project: {
    framework: "vite",
    hasReactCompiler: false,
    hasReactNativeWorkspace: false,
    hasTanStackQuery: false,
    hasTypeScript: true,
    projectName: "fixture",
    reactMajorVersion: 19,
    reactVersion: "19.0.0",
    rootDirectory: "/repo",
    sourceFileCount: 1,
    tailwindVersion: null,
  },
  score: { label: "Needs work", score: 42 },
  skippedChecks: [],
};

describe("runReactDoctor", () => {
  beforeEach(() => {
    diagnoseMock.mockReset();
  });

  it("creates a structured report from the React Doctor API", async () => {
    diagnoseMock.mockResolvedValueOnce(diagnoseResult);

    const outcome = await runReactDoctor(config);

    expect(diagnoseMock).toHaveBeenCalledWith(".", {
      deadCode: true,
      lint: true,
      respectInlineDisables: true,
      verbose: false,
    });
    expect(outcome.status).toBe("completed");
    if (outcome.status !== "completed") return;
    expect(outcome.report.summary).toMatchObject({
      errorCount: 1,
      score: 42,
      totalDiagnosticCount: 1,
    });
  });

  it("skips non-React projects when configured to do so", async () => {
    const error = new Error("No React dependency found");
    error.name = "NoReactDependencyError";
    diagnoseMock.mockRejectedValueOnce(error);

    const outcome = await runReactDoctor(config);

    expect(outcome.status).toBe("skipped");
    expect(outcome.skippedProjects).toEqual([
      {
        directory: ".",
        reason: "No React dependency found",
      },
    ]);
  });
});
