// Augment Wrangler-generated Env type with secret bindings.
// Wrangler runtime types only include bindings declared in wrangler.jsonc (KV, vars, etc.).
// Secrets set via `wrangler secret put` are real at runtime but not reflected in the generated Env.
//
// Keep this list in sync with the secrets you use in code.
interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
  STATUSPAGE_IO_API_KEY: string;
  STATUSPAGE_IO_PAGE_ID: string;
}
