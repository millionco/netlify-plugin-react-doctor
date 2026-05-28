import { ZodError } from "zod";
import { normalizeInputs } from "./config.js";
import { evaluateGate } from "./gate.js";
import { formatBuildFailureMessage, formatStatus } from "./format.js";
import { getNetlifyUtils } from "./netlify-utils.js";
import { writeJsonReport } from "./report.js";
import { runReactDoctor } from "./runner.js";
import type { NetlifyPluginContext } from "./types.js";

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const formatConfigError = (error: ZodError): Error =>
  new Error(
    `Invalid React Doctor plugin inputs: ${error.issues.map((issue) => issue.message).join("; ")}`,
  );

export async function onPreBuild({ inputs, utils }: NetlifyPluginContext = {}): Promise<void> {
  const netlifyUtils = getNetlifyUtils(utils);
  let failureMessage: string | null = null;

  try {
    const config = normalizeInputs(inputs);
    console.log(
      `Running React Doctor on ${config.projects.length > 0 ? config.projects.join(", ") : config.directory}`,
    );

    const outcome = await runReactDoctor(config);
    const gate = evaluateGate(outcome, config.failOn);
    const status = formatStatus(outcome, gate, config);
    netlifyUtils.status.show(status);

    if (outcome.status === "completed") {
      const reportPath = await writeJsonReport(config, outcome.report);
      if (reportPath) console.log(`React Doctor JSON report written to ${reportPath}`);
    }

    if (gate.shouldFail) {
      failureMessage = formatBuildFailureMessage(gate);
    }
  } catch (error) {
    const normalizedError = error instanceof ZodError ? formatConfigError(error) : toError(error);
    netlifyUtils.build.failPlugin("React Doctor plugin failed.", {
      error: normalizedError,
    });
  }

  if (failureMessage) netlifyUtils.build.failBuild(failureMessage);
}
