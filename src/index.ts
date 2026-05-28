import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ZodError } from "zod";
import { normalizeInputs } from "./config.js";
import { formatStatus } from "./format.js";
import { runReactDoctor } from "./runner.js";
import type { Diagnostic, GateResult, NetlifyPluginContext, StatusPayload } from "./types.js";

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const formatConfigError = (error: ZodError): Error =>
  new Error(
    `Invalid React Doctor plugin inputs: ${error.issues.map((issue) => issue.message).join("; ")}`,
  );

const showStatusLocally = (payload: StatusPayload): void => {
  console.log("\n--- utils.status.show() ---");
  console.log(payload.summary);
  if (payload.text) console.log(payload.text);
  console.log("---------------------------\n");
};

const failLocally = (message: string, { error }: { error?: Error } = {}): void => {
  console.error(message);
  if (error) console.error(error.message);
  process.exitCode = 1;
};

const blockingDiagnostics = (
  diagnostics: readonly Diagnostic[],
  failOn: GateResult["failOn"],
): readonly Diagnostic[] => {
  if (failOn === "none") return [];
  if (failOn === "warning") return diagnostics;
  return diagnostics.filter((diagnostic) => diagnostic.severity === "error");
};

const plural = (count: number, singular: string): string =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

export async function onPreBuild({ inputs, utils }: NetlifyPluginContext = {}): Promise<void> {
  const showStatus = utils?.status?.show ?? showStatusLocally;
  const failBuild = utils?.build?.failBuild ?? failLocally;
  const failPlugin = utils?.build?.failPlugin ?? failLocally;
  let failureMessage: string | null = null;

  try {
    const config = normalizeInputs(inputs);
    console.log(
      `Running React Doctor on ${config.projects.length > 0 ? config.projects.join(", ") : config.directory}`,
    );

    const outcome = await runReactDoctor(config);
    const diagnostics = outcome.status === "completed" ? outcome.diagnostics : [];
    const failingDiagnostics = blockingDiagnostics(diagnostics, config.failOn);
    const gate: GateResult = {
      failOn: config.failOn,
      failingDiagnostics,
      shouldFail: failingDiagnostics.length > 0,
    };
    const status = formatStatus(outcome, gate, config);
    showStatus(status);

    if (outcome.status === "completed" && config.outputPath) {
      const reportPath = path.resolve(process.cwd(), config.outputPath);
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, `${JSON.stringify(outcome.report, null, 2)}\n`, "utf8");
      console.log(`React Doctor JSON report written to ${reportPath}`);
    }

    if (gate.shouldFail) {
      const threshold =
        gate.failOn === "warning" ? "warnings or errors" : `${gate.failOn} diagnostics`;
      failureMessage = `React Doctor found ${plural(
        gate.failingDiagnostics.length,
        "blocking diagnostic",
      )} matching fail_on=${gate.failOn} (${threshold}).`;
    }
  } catch (error) {
    const normalizedError = error instanceof ZodError ? formatConfigError(error) : toError(error);
    failPlugin("React Doctor plugin failed.", {
      error: normalizedError,
    });
  }

  if (failureMessage) failBuild(failureMessage);
}
