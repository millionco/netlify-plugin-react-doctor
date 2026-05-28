import type {
  Diagnostic,
  JsonReport,
  JsonReportProjectEntry,
  JsonReportSummary,
  ProjectInfo,
  ScoreResult,
} from "react-doctor/api";

export type {
  Diagnostic,
  JsonReport,
  JsonReportProjectEntry,
  JsonReportSummary,
  ProjectInfo,
  ScoreResult,
};

export type FailOnLevel = "error" | "warning" | "none";

export interface PluginConfig {
  readonly deadCode: boolean;
  readonly directory: string;
  readonly failOn: FailOnLevel;
  readonly lint: boolean;
  readonly maxFindings: number;
  readonly noScore: boolean;
  readonly outputPath?: string;
  readonly projects: readonly string[];
  readonly respectInlineDisables: boolean;
  readonly skipWithoutReact: boolean;
  readonly verbose: boolean;
}

export interface SkippedProject {
  readonly directory: string;
  readonly reason: string;
}

export interface CompletedScan {
  readonly diagnostics: readonly Diagnostic[];
  readonly report: JsonReport;
  readonly skippedProjects: readonly SkippedProject[];
  readonly status: "completed";
}

export interface SkippedScan {
  readonly reason: string;
  readonly skippedProjects: readonly SkippedProject[];
  readonly status: "skipped";
}

export type ScanOutcome = CompletedScan | SkippedScan;

export interface GateResult {
  readonly failOn: FailOnLevel;
  readonly failingDiagnostics: readonly Diagnostic[];
  readonly shouldFail: boolean;
}

export interface StatusPayload {
  readonly extraData?: unknown[];
  readonly summary: string;
  readonly text?: string;
  readonly title: string;
}

export interface NetlifyBuildUtils {
  readonly build?: {
    readonly failBuild?: (message: string, options?: { error?: Error }) => void;
    readonly failPlugin?: (message: string, options?: { error?: Error }) => void;
  };
  readonly status?: {
    readonly show?: (payload: StatusPayload) => void;
  };
}

export interface NetlifyPluginContext {
  readonly constants?: {
    readonly PUBLISH_DIR?: string;
  };
  readonly inputs?: Record<string, unknown>;
  readonly packageJson?: unknown;
  readonly utils?: NetlifyBuildUtils;
}
