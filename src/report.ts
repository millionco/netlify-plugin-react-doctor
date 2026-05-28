import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { JsonReport, PluginConfig } from "./types.js";

export async function writeJsonReport(
  config: PluginConfig,
  report: JsonReport,
): Promise<string | null> {
  if (!config.outputPath) return null;

  const outputPath = path.resolve(process.cwd(), config.outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return outputPath;
}
