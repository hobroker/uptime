# Uptime - Scheduled Uptime Monitoring on Cloudflare Workers

[![CI](https://github.com/hobroker/uptime/actions/workflows/ci.yaml/badge.svg)](https://github.com/hobroker/uptime/actions/workflows/ci.yaml) [![Deploy Worker](https://github.com/hobroker/uptime/actions/workflows/deploy.yaml/badge.svg)](https://github.com/hobroker/uptime/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-blue)](https://www.typescriptlang.org/)

**Uptime** is a lightweight, serverless monitoring service built on **Cloudflare Workers**. It runs on a cron schedule, performs a configurable list of health **checks**, stores the latest state in **Workers KV**, and sends **Telegram** alerts on downtime and recovery. Optionally, it can sync component status to **Statuspage.io**.

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Installation](#installation)
  - [Manual Deployment](#manual-deployment)
  - [Automatic Deployment from GitHub](#automatic-deployment-from-github)
  - [Local Development](#local-development)
- [Usage](#usage)
  - [Example Telegram message](#example-telegram-message)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Active Monitoring**: Periodically checks the availability of configured targets.
- **Serverless**: Runs on Cloudflare Workers with minimal infrastructure overhead.
- **Telegram Alerts**: Sends a single downtime alert per incident and a recovery message when all checks are healthy again.
- **Statuspage Sync (Optional)**: Maps each check to a Statuspage component and updates its status.
- **Zero Trust Support**: Works with sites behind Cloudflare Zero Trust via client credentials.

## How It Works

1. Configure a list of checks in `uptime.config.ts`.
2. A scheduled Cloudflare Worker runs on a cron defined in `packages/uptime-worker/wrangler.jsonc`.
3. Each check is performed; results are stored in Workers KV (state + last-checked timestamp).
4. If any check fails, a single Telegram alert is sent and subsequent alerts are suppressed for that incident.
5. When all checks recover, a Telegram recovery message is sent.
6. If Statuspage.io credentials are configured, each check is synced to a Statuspage component.

## Tech Stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) for development and deployment
- [TypeScript](https://www.typescriptlang.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api) (via [grammy](https://grammy.dev/))
- [Statuspage API](https://developer.statuspage.io/) (optional)
- GitHub Actions (optional deployment)

## Getting Started

### Prerequisites

- A Cloudflare account
- A [Telegram bot](https://core.telegram.org/bots#how-do-i-create-a-bot) and a chat for notifications

### Environment Setup

1. Create a KV namespace for storing check states:
   ```shell
   cd packages/uptime-worker/
   npx wrangler kv namespace uptime
   ```
   This will output a namespace ID, which you need to add to your `wrangler.json` file under the `kv_namespaces` section:
   ```json
   {
     "kv_namespaces": [
       {
         "binding": "uptime",
         "id": "<your-namespace-id>"
       }
     ]
   }
   ```
2. Add the Telegram secrets to your Cloudflare Workers environment variables:
   ```shell
   cd packages/uptime-worker/
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```
3. Optional: Configure Statuspage.io sync if you want component updates.
   ```shell
   cd packages/uptime-worker/
   npx wrangler secret put STATUSPAGE_IO_API_KEY
   npx wrangler secret put STATUSPAGE_IO_PAGE_ID
   ```
4. Optionally, set up Cloudflare Zero Trust if your websites are protected by it.
   ```shell
   cd packages/uptime-worker/
   npx wrangler secret put CF_ACCESS_CLIENT_ID
   npx wrangler secret put CF_ACCESS_CLIENT_SECRET
   ```

### Installation

1. Clone or download the Uptime repository.
2. Install the required dependencies:
   ```shell
   npm install
   ```
3. Generate the Cloudflare type definitions:
   ```shell
   npm run cf-typegen
   ```
4. Configure your list of targets to check in the [configuration file](uptime.config.ts). Example:
   ```typescript
   export default {
     checks: [
       {
         name: "Example Site",
         target: "https://example.com",
         probeTarget: "https://status.example.com", // Optional: URL to probe (defaults to target)
         expectedCodes: [200], // Optional: Expected HTTP status codes (defaults to [200])
         timeout: 5000, // Optional: Request timeout in ms (defaults to 5000)
         headers: undefined, // Optional: Additional headers to send with the request
         body: undefined, // Optional: Body to send with the request (for POST or PUT requests)
       },
       // Add more checks as needed
     ],
   };
   ```
5. Deploy the project to Cloudflare Workers:
   ```shell
   npm run deploy
   ```

### Manual Deployment

Deploy Uptime to Cloudflare Workers using the following command:

```shell
npm run deploy
```

### Automatic Deployment from GitHub

To enable automatic deployments from GitHub Actions, you'll need to set up a Cloudflare API token:

1. Generate a Cloudflare API token by following the instructions at: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
2. Add the token as a GitHub repository secret:
   - Go to your GitHub repository
   - Navigate to **Settings** > **Secrets and variables** > **Actions**
   - Click **New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Your generated Cloudflare API token
3. The GitHub Actions workflow will automatically deploy your changes when you push to the main branch.

### Local Development

1. Install dependencies:
   ```shell
   npm install
   ```
2. Create a `.dev.vars` file in the `packages/uptime-worker/` directory with the following content:
   ```plaintext
   CF_ACCESS_CLIENT_ID=<value>
   CF_ACCESS_CLIENT_SECRET=<value>
   TELEGRAM_BOT_TOKEN=<value>
   TELEGRAM_CHAT_ID=<value>
   ```
3. Start the development server:
   ```shell
   npm run dev
   ```
4. Test the worker locally by calling the scheduled endpoint. This simulates a scheduled CRON event locally using the `__scheduled` endpoint.
   ```shell
   curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
   ```

## Usage

Once deployed, Uptime will automatically run on the configured cron schedule, perform the checks in `uptime.config.ts`, and send Telegram notifications based on state changes.

### Example Telegram message

<img width="601" alt="image" src="https://github.com/user-attachments/assets/034e1bba-b11d-4046-9866-9a33979bbed7" />

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests to improve Uptime.
Before submitting a PR, please run:

```bash
npm run lint
```

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). See the [LICENSE](LICENSE) file for details.

---

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/guidelines/download-assets-sm-1.svg)](https://coff.ee/hobroker)
