import type { StatuspageConfig } from "./types";

export class StatuspageBaseService {
  protected apiKey: string;
  protected pageId: string;
  protected baseUrl = "https://api.statuspage.io/v1";

  constructor({ apiKey, pageId }: StatuspageConfig) {
    this.apiKey = apiKey;
    this.pageId = pageId;
  }

  protected async request<T>(
    path: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const { json, ...rest } = init;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      headers: {
        Authorization: `OAuth ${this.apiKey}`,
        Accept: "application/json",
        ...(json ? { "Content-Type": "application/json" } : {}),
        ...(rest.headers || {}),
      },
      body: json ? JSON.stringify(json) : rest.body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Statuspage API error ${res.status} ${res.statusText}: ${text}`,
      );
    }

    // Some endpoints return empty body; handle that.
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }
}
