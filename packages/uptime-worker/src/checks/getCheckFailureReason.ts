import { ResolvedCheckConfig } from "../types";

const isCloudflareAccessLoginResponse = (response: Response): boolean => {
  const { pathname } = new URL(response.url);
  return pathname.startsWith("/cdn-cgi/access/");
};

export const getCheckFailureReason = (
  check: ResolvedCheckConfig,
  response: Response,
): string | undefined => {
  if (isCloudflareAccessLoginResponse(response)) {
    return `Protected by Zero Trust login page (HTTP ${response.status})`;
  }

  if (check.expectedCodes.includes(response.status)) {
    return undefined;
  }

  return `HTTP ${response.status} ${response.statusText}`;
};
