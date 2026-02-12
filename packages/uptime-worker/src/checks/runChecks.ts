import pLimit from "p-limit";
import { performCheck } from "./performCheck";
import { UptimeWorkerConfig } from "../types";
import { resolveCheckConfig } from "./resolveCheckConfig";

const limit = pLimit(2);

export const runChecks = async (
  config: UptimeWorkerConfig,
  { env }: { env: Env },
) =>
  Promise.all(
    config.checks
      .map(resolveCheckConfig)
      .map((check) => () => performCheck(check, { env }))
      .map(limit),
  );
