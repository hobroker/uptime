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
- **Telegram Alerts**: Sends notifications that dynamically update to accurately reflect the current state of all checks.
- **Statuspage Sync (Optional)**: Maps each check to a Statuspage component and updates its status.
- **Zero Trust Support**: Works with sites behind Cloudflare Zero Trust via client credentials.

## How It Works

1. Configure a list of checks in `uptime.config.ts`.
2. A scheduled Cloudflare Worker runs on a cron defined in `packages/uptime-worker/wrangler.jsonc`.
3. Each check is performed; results are stored in Workers KV (state + last-checked timestamp).
4. If any check fails, a Telegram alert is sent and subsequently updated to accurately reflect the state of all checks until full recovery.
5. If Statuspage.io credentials are configured, each check is synced to a Statuspage component.

## Tech Stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) for development and deployment
- [TypeScript](https://www.typescriptlang.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api) (via [grammy](https://grammy.dev/))
- [LiquidJS](https://liquidjs.com/) for template parsing
- [Statuspage API](https://developer.statuspage.io/) (optional)
- GitHub Actions (optional deployment)

## Getting Started

### Quick Start

1. **Clone the repository**:

   ```shell
   git clone https://github.com/hobroker/uptime.git
   cd uptime
   ```

2. **Run the interactive setup**:

   ```shell
   npm install
   npm run setup
   ```

   This script will help you:
   - Login to Cloudflare.
   - Create the required KV namespace and update your configuration.
   - Set up your Telegram and optional Statuspage secrets.
   - Prepare your local environment.

3. **Configure your monitors**:
   Edit `packages/uptime-worker/uptime.config.ts`. Here's a basic example:

   ```typescript
   export const uptimeWorkerConfig: UptimeWorkerConfig = {
     checks: [
       {
         name: "My Website",
         target: "https://example.com",
         retryCount: 2,
       },
       {
         name: "API Health",
         target: "https://api.example.com/health",
         method: "GET",
         expectedCodes: [200],
       },
     ],
   };
   ```

4. **Deploy**:
   ```shell
   npm run deploy
   ```

### Prerequisites

- A [Cloudflare](https://www.cloudflare.com/) account.
- A [Telegram bot](https://core.telegram.org/bots#how-do-i-create-a-bot) and a chat for notifications.

### Manual Setup (Optional)

If you prefer to set up everything manually, follow these steps:

1. **KV Namespace**: Create a KV namespace named `uptime` and add its ID to `packages/uptime-worker/wrangler.jsonc`.
2. **Secrets**: Use `npx wrangler secret put` for `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and other optional credentials.
3. **Local Vars**: Copy `packages/uptime-worker/.dev.vars.example` to `packages/uptime-worker/.dev.vars` and fill in the values.

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

1. **Install dependencies**:
   ```shell
   npm install
   ```
2. **Setup environment**:
   Run the interactive setup to automatically create your `.dev.vars` file and generate types:
   ```shell
   npm run setup
   ```
3. **Start development server**:
   ```shell
   npm run dev
   ```
4. **Test the worker locally**:
   Uptime uses Cloudflare Cron Triggers. You can simulate a cron event locally by calling the `/__scheduled` endpoint:
   ```shell
   curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
   ```

## Usage

Once deployed, Uptime will automatically run on the configured cron schedule, perform the checks in `uptime.config.ts`, and send Telegram notifications based on state changes.

### Example Telegram message

<img width="601" alt="image" src="https://github.com/user-attachments/assets/034e1bba-b11d-4046-9866-9a33979bbed7" />

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Workflow

1.  **Check types**: `npm run ts-check`
2.  **Lint**: `npm run lint`
3.  **Format**: `npm run format`
4.  **Test**: `npm run test`

Before submitting a PR, please ensure all the above checks pass. We use [Turbo](https://turbo.build/) to manage the monorepo, so these commands will run across all packages.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). See the [LICENSE](LICENSE) file for details.

---

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/guidelines/download-assets-sm-1.svg)](https://coff.ee/hobroker)
