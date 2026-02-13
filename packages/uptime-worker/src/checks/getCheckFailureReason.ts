import { ResolvedCheckConfig } from "../types";

const isCloudflareAccessResponse = (response: Response): boolean => {
  const { pathname } = new URL(response.url);
  return pathname.startsWith("/cdn-cgi/access/");
};

export const getCheckFailureReason = (
  check: ResolvedCheckConfig,
  response: Response,
): string | undefined => {
  if (isCloudflareAccessResponse(response)) {
    return `Protected by Cloudflare Access (HTTP ${response.status})`;
  }

  if (check.expectedCodes.includes(response.status)) {
    return undefined;
  }

  return `HTTP ${response.status} ${response.statusText}`;
};
