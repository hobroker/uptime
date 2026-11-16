# Setup instructions for coding agents

These are instructions for a local coding agent (Claude Code, Codex, Cursor, etc.) to set up a fresh clone of this repo for the user's own Cloudflare account. To start, the user asks their agent:

> Set up this repo by following SETUP.md.

## Ground rules

- **Never ask for, read, print or store secret values.** Bot tokens, API keys, chat IDs and similar values are entered by the user in their own terminal, never in chat. When a step needs a secret, give the user the exact command to run and wait for them to confirm it's done. If your tool lets the user run a command in the session directly (e.g. `!` in Claude Code), mention that option.
- **Ask before changing the user's Cloudflare account.** Say what you're about to create, rename or deploy, and wait for a yes.
- **Every step can be run again.** Check the current state first and skip what's already done. Don't create a second KV namespace when one already exists.
- Run all commands from the repo root unless a step says otherwise. Worker commands run in `packages/uptime-worker`.
- If a step fails, show the error, explain what it means, and stop. Don't guess your way past it.

## Steps

### 1. Install dependencies

Run `npm install` if `node_modules` is missing or out of date. Node.js 20+ is required: check `node --version` first.

### 2. Log in to Cloudflare

Run `npx wrangler whoami` in `packages/uptime-worker`.

- If it shows an account, confirm with the user that it's the account they want to use.
- If it doesn't, ask the user to run `npx wrangler login`. It opens a browser, so the user should run it themselves. Run `npx wrangler whoami` again afterwards.

### 3. Choose the Worker name

The Worker name is the `name` field in `packages/uptime-worker/wrangler.jsonc` (default `uptime-worker`). Ask the user if they want a different name. It must be lowercase letters, digits and hyphens only. Update `name` if they choose a new one.

### 4. Set up the KV namespace

The Worker stores its state in a KV namespace bound as `uptime` (the `kv_namespaces` entry with `"binding": "uptime"` in `wrangler.jsonc`). The `id` already in the file belongs to the upstream repo's account, so it won't work for the user.

1. Run `npx wrangler kv namespace list` in `packages/uptime-worker`. It prints a JSON array of `{ id, title }`.
2. If the `id` in `wrangler.jsonc` appears in that list, the namespace is already set up. Skip to the next step.
3. Otherwise, look for an existing namespace titled `uptime` or `<worker-name>-uptime`. If there is one, ask the user if they want to reuse it.
4. If there's none, or the user doesn't want to reuse it, create one with `npx wrangler kv namespace create uptime` and take the `id` from its output.
5. Write that id into the `uptime` binding's `id` in `wrangler.jsonc`. Change only that value and keep the rest of the file (comments, trailing commas) as it is.

### 5. Choose notification channels and set secrets

Ask the user which features they want, then list the secrets each one needs:

| Feature                                  | Secrets                                          |
| ---------------------------------------- | ------------------------------------------------ |
| Telegram notifications (required)        | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`         |
| Statuspage incidents (optional)          | `STATUSPAGE_IO_API_KEY`, `STATUSPAGE_IO_PAGE_ID` |
| Heartbeat / dead-man's-switch (optional) | `HEARTBEAT_URL`                                  |
| Targets behind Cloudflare Access         | `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` |

The README's "Environment Variables & Secrets" section explains each one and where to get it.

For each secret, ask the user to run this in `packages/uptime-worker` and paste the value at wrangler's prompt:

```shell
npx wrangler secret put <NAME>
```

If wrangler offers to create the Worker because it doesn't exist yet, the user should accept. To check what's set without seeing any values, run `npx wrangler secret list`.

### 6. Create local dev vars

If `packages/uptime-worker/.dev.vars` doesn't exist, copy it from `.dev.vars.example`. Tell the user to fill in the values themselves for local runs (`npm run dev`). Don't fill it in or read it back. It's git-ignored.

### 7. Configure the checks

`packages/uptime-worker/uptime.config.ts` defines what gets monitored. The checks in the repo are the upstream author's, so replace them with the user's own:

1. Ask the user which URLs to monitor. For each, ask for a display name and anything special: expected status codes, custom headers, retries, flap filtering.
2. Rewrite the `checks` array. Keep the `zeroTrustAuth` helper only if a target is behind Cloudflare Access. Otherwise remove it and its usage.
3. Set `statuspage.url` to the user's status page, or remove the `statuspage` block if they don't use one. Ask whether they want `autoPostmortem` turned on.

The README's "Configuration" section and `packages/uptime-worker/src/types.d.ts` (`CheckConfig`) list every option.

### 8. Verify

Run these from the repo root and fix anything they report:

```shell
npm run cf-typegen
npm run lint
npm run ts-check
npm test
```

### 9. Deploy

Ask the user before deploying, then run `npm run deploy`. Afterwards:

- Remind them the cron trigger (`triggers.crons` in `wrangler.jsonc`, every 5 minutes by default) runs the checks. The first run happens on the next tick.
- Suggest watching the logs with `npx wrangler tail` in `packages/uptime-worker`.
- If they set up the heartbeat, tell them to confirm their heartbeat monitor receives pings.

## Done

Summarize for the user: the Worker name, the KV namespace id, which secrets are set (names only), how many checks are configured, and whether it's deployed.
