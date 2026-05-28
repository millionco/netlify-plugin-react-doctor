import type { Diagnostic, FailOnLevel, GateResult, ScanOutcome } from "./types.js";

export function failingDiagnosticsForLevel(
  diagnostics: readonly Diagnostic[],
  failOn: FailOnLevel,
): readonly Diagnostic[] {
  if (failOn === "none") return [];
  if (failOn === "warning") return diagnostics;
  return diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

export function evaluateGate(outcome: ScanOutcome, failOn: FailOnLevel): GateResult {
  const diagnostics = outcome.status === "completed" ? outcome.diagnostics : [];
  const failingDiagnostics = failingDiagnosticsForLevel(diagnostics, failOn);

  return {
    failOn,
    failingDiagnostics,
    shouldFail: failingDiagnostics.length > 0,
  };
}
