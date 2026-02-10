import pLimit from "p-limit";
import { performCheck } from "./performCheck";
import { CheckResultList, UptimeWorkerConfig } from "../types";
import { resolveCheckConfig } from "./resolveCheckConfig";

const limit = pLimit(1);

export const runChecks = async (
  config: UptimeWorkerConfig,
  { env }: { env: Env },
) => {
  const state: CheckResultList = await Promise.all(
    config.checks
      .map(resolveCheckConfig)
      .map((check) => () => performCheck(check, { env }))
      .map(limit),
  );

  return state;
};
