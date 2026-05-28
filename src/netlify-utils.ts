import type { NetlifyBuildUtils, ResolvedNetlifyBuildUtils, StatusPayload } from "./types.js";

const logStatus = (payload: StatusPayload): void => {
  console.log("\n--- utils.status.show() ---");
  console.log(payload.summary);
  if (payload.text) console.log(payload.text);
  console.log("---------------------------\n");
};

export function getNetlifyUtils(utils: NetlifyBuildUtils | undefined): ResolvedNetlifyBuildUtils {
  return {
    build: {
      failBuild:
        utils?.build?.failBuild ??
        ((message, { error } = {}) => {
          console.error(message);
          if (error) console.error(error.message);
          process.exitCode = 1;
        }),
      failPlugin:
        utils?.build?.failPlugin ??
        ((message, { error } = {}) => {
          console.error(message);
          if (error) console.error(error.message);
          process.exitCode = 1;
        }),
    },
    status: {
      show: utils?.status?.show ?? logStatus,
    },
  };
}
