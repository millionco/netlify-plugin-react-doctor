import { describe, expect, it } from "vitest";
import { normalizeInputs } from "../src/config.js";

describe("normalizeInputs", () => {
  it("uses documented defaults", () => {
    expect(normalizeInputs({}, {})).toEqual({
      deadCode: true,
      directory: ".",
      failOn: "error",
      lint: true,
      maxFindings: 20,
      noScore: false,
      outputPath: undefined,
      projects: [],
      respectInlineDisables: true,
      skipWithoutReact: true,
      verbose: false,
    });
  });

  it("lets plugin inputs override environment fallbacks", () => {
    expect(
      normalizeInputs(
        {
          fail_on: "warning",
          projects: ["apps/web"],
          skip_without_react: false,
        },
        {
          REACT_DOCTOR_FAIL_ON: "none",
          REACT_DOCTOR_PROJECTS: "apps/admin,packages/ui",
          REACT_DOCTOR_SKIP_WITHOUT_REACT: "true",
        },
      ),
    ).toMatchObject({
      failOn: "warning",
      projects: ["apps/web"],
      skipWithoutReact: false,
    });
  });

  it("parses string inputs from netlify.toml and environment variables", () => {
    expect(
      normalizeInputs(
        {
          dead_code: "false",
          max_findings: "5",
          verbose: "true",
        },
        {
          REACT_DOCTOR_PROJECTS: '["apps/web","apps/docs"]',
        },
      ),
    ).toMatchObject({
      deadCode: false,
      maxFindings: 5,
      projects: ["apps/web", "apps/docs"],
      verbose: true,
    });
  });
});
