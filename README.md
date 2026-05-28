# Netlify Plugin React Doctor

Run [React Doctor](https://react.doctor/docs) automatically in Netlify builds and stop bad React code before it ships.

`netlify-plugin-react-doctor` is a Netlify Build Plugin that runs during `onPreBuild`, before your site build command starts. It scans your React source with React Doctor, writes a concise deploy log, shows a Deploy Summary card in Netlify, and can fail the build when findings meet your configured severity gate.

## Why Use This

React Doctor catches React-specific issues across state and effects, performance, architecture, security, accessibility, and dead code. Running it in Netlify gives every deploy the same check without asking developers to remember another local command.

Use this plugin when you want to:

- Block deploys with serious React anti-patterns.
- Introduce React Doctor gradually in report-only mode.
- Show React health scores and top findings directly in Netlify deploy details.
- Scan one React app or several app roots in a monorepo.

## Quick Start

Install the plugin in your site repository:

```bash
npm install -D netlify-plugin-react-doctor
```

Add it to `netlify.toml`:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"
```

By default, the plugin scans `.` during `onPreBuild` and fails the build when React Doctor reports an `error` diagnostic.

## Recommended Rollout

For an existing app, start in report-only mode:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    fail_on = "none"
```

After the first wave of issues is fixed, turn on the default gate:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    fail_on = "error"
```

For stricter teams, block on both warnings and errors:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    fail_on = "warning"
```

## Configuration

Configure the plugin with `plugins.inputs` in `netlify.toml`.

- `directory`: project directory to scan. Defaults to `"."`.
- `projects`: optional list of project directories to scan. Defaults to `[]`.
- `fail_on`: severity gate for failing the build. Defaults to `"error"`. Allowed values are `"error"`, `"warning"`, and `"none"`.
- `skip_without_react`: skip cleanly when no React dependency is found. Defaults to `true`.
- `lint`: run React Doctor lint checks. Defaults to `true`.
- `dead_code`: run React Doctor dead-code analysis. Defaults to `true`.
- `verbose`: pass verbose scan behavior through to React Doctor. Defaults to `false`.
- `no_score`: skip React Doctor score calculation. Defaults to `false`.
- `respect_inline_disables`: respect inline `eslint`, `oxlint`, and `react-doctor` disable comments. Defaults to `true`.
- `max_findings`: maximum number of diagnostics shown in the Deploy Summary details. Defaults to `20`.
- `output_path`: optional path for the full JSON report, relative to the repository root. Defaults to unset.

Example with all common options:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    directory = "."
    fail_on = "error"
    max_findings = 20
    no_score = false
    skip_without_react = true
```

## Environment Variables

Every plugin input also has an environment-variable fallback. Values in `netlify.toml` take precedence over environment variables.

- `REACT_DOCTOR_DIRECTORY`
- `REACT_DOCTOR_PROJECTS`
- `REACT_DOCTOR_FAIL_ON`
- `REACT_DOCTOR_SKIP_WITHOUT_REACT`
- `REACT_DOCTOR_LINT`
- `REACT_DOCTOR_DEAD_CODE`
- `REACT_DOCTOR_VERBOSE`
- `REACT_DOCTOR_NO_SCORE`
- `REACT_DOCTOR_RESPECT_INLINE_DISABLES`
- `REACT_DOCTOR_MAX_FINDINGS`
- `REACT_DOCTOR_OUTPUT_PATH`

Example:

```bash
REACT_DOCTOR_FAIL_ON=none
REACT_DOCTOR_DIRECTORY=apps/web
REACT_DOCTOR_PROJECTS=apps/web,apps/admin
REACT_DOCTOR_MAX_FINDINGS=10
```

`REACT_DOCTOR_PROJECTS` accepts either a comma-separated list or a JSON array.

## Monorepos

For a single React app inside a monorepo, point `directory` at the app:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    directory = "apps/web"
```

For multiple app roots, use `projects`:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    projects = ["apps/web", "apps/admin", "packages/ui"]
    fail_on = "error"
```

React Doctor’s own configuration is still respected. You can use `react-doctor.config.json` for `rootDir`, ignores, rule severities, categories, surfaces, dead-code settings, and inline-disable behavior.

## Build Behavior

The plugin runs in `onPreBuild`, before Netlify executes your site’s build command.

On each run it:

1. Normalizes plugin inputs and environment fallback values.
2. Runs React Doctor with the configured scan target.
3. Builds a structured report from React Doctor diagnostics and score data.
4. Calls `utils.status.show()` once to render a Deploy Summary card.
5. Applies the `fail_on` gate and calls `utils.build.failBuild()` when the gate is crossed.

If `skip_without_react` is enabled and the target is not a React project, the plugin reports a skipped status instead of failing the build.

## Deploy Summary

The Netlify deploy summary includes:

- Pass, fail, or skipped status.
- React Doctor score and score label when available.
- Error and warning counts.
- Affected file count.
- Scanned project metadata.
- Skipped checks, if any.
- Top findings sorted by severity and location.

The plugin uses the classic Build Plugin UI path, `utils.status.show()`. A richer custom React UI inside `app.netlify.com` would be a separate Netlify SDK extension that can reuse this plugin’s structured report data.

## JSON Reports

Set `output_path` to write the full React Doctor report to disk:

```toml
[[plugins]]
  package = "netlify-plugin-react-doctor"

  [plugins.inputs]
    output_path = "reports/react-doctor.json"
```

The path is resolved from the repository root. Create a path under your publish directory if you want the report included in the deployed site.

## Requirements

React Doctor requires Node `^20.19.0 || >=22.12.0`. This plugin declares the same engine range.

If your Netlify site uses an older Node version, set a supported version with `NODE_VERSION` or your preferred Netlify Node version configuration.

The plugin depends on `react-doctor` directly. It does not run `npx` during builds.

## Troubleshooting

### The build fails before my site build command runs

That is expected when React Doctor finds diagnostics matching `fail_on`. Use `fail_on = "none"` to introduce the plugin without blocking deploys.

### The score is unavailable

Scoring can be unavailable if React Doctor cannot reach its score service or if `no_score = true` is set. Deploy gating is based on diagnostics, not the score.

### Non-React projects are skipped

By default, `skip_without_react = true` prevents accidental installation from breaking non-React sites. Set it to `false` if missing React should be treated as a plugin failure.

### I only want to scan changed files

This plugin currently runs full scans. React Doctor is fast enough for typical `onPreBuild` usage, and full scans avoid CI diff-base ambiguity on Netlify. Diff mode can be added later with React Doctor CLI parity.

### Netlify says `extraData` is invalid

Use a current plugin build. Netlify requires Deploy Summary `extraData` to be an array, and this plugin emits that shape.

## Local Development

Install dependencies:

```bash
bun install
```

Run the verification suite:

```bash
bun run test
bun run lint
bun run typecheck
bun run build
```

Run the local Netlify fixture:

```bash
cd test/fixtures/netlify-site
bunx netlify build --offline
```

The fixture loads this plugin by relative path:

```toml
[[plugins]]
  package = "../../.."
```

## Package Contents

Published package contents are limited to:

- `dist`
- `manifest.yml`
- `README.md`

`dist/index.js` is the Netlify plugin entrypoint.

## License

MIT
