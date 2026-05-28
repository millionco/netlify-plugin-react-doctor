import { describe, expect, it } from "vitest";
import { evaluateGate } from "../src/gate.js";
import type { Diagnostic, ScanOutcome } from "../src/types.js";

const diagnostic = (severity: Diagnostic["severity"]): Diagnostic => ({
  category: "Correctness",
  column: 1,
  filePath: "src/App.tsx",
  help: "Fix the component.",
  line: 1,
  message: `${severity} diagnostic`,
  plugin: "react-doctor",
  rule: "test-rule",
  severity,
});

const outcome: ScanOutcome = {
  diagnostics: [diagnostic("warning"), diagnostic("error")],
  report: {
    diagnostics: [],
    diff: null,
    directory: ".",
    elapsedMilliseconds: 1,
    error: null,
    mode: "full",
    ok: true,
    projects: [],
    schemaVersion: 1,
    summary: {
      affectedFileCount: 1,
      errorCount: 1,
      score: null,
      scoreLabel: null,
      totalDiagnosticCount: 2,
      warningCount: 1,
    },
    version: "test",
  },
  skippedProjects: [],
  status: "completed",
};

describe("evaluateGate", () => {
  it("matches React Doctor fail-on=none semantics", () => {
    expect(evaluateGate(outcome, "none")).toMatchObject({
      failingDiagnostics: [],
      shouldFail: false,
    });
  });

  it("matches React Doctor fail-on=error semantics", () => {
    const result = evaluateGate(outcome, "error");

    expect(result.shouldFail).toBe(true);
    expect(result.failingDiagnostics).toHaveLength(1);
    expect(result.failingDiagnostics[0]?.severity).toBe("error");
  });

  it("matches React Doctor fail-on=warning semantics", () => {
    const result = evaluateGate(outcome, "warning");

    expect(result.shouldFail).toBe(true);
    expect(result.failingDiagnostics).toHaveLength(2);
  });
});
