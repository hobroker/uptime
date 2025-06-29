# Uptime - Website Monitoring with Cloudflare Workers

[![CI](https://github.com/hobroker/uptime/actions/workflows/ci.yaml/badge.svg)](https://github.com/hobroker/uptime/actions/workflows/ci.yaml) [![Deploy Worker](https://github.com/hobroker/uptime/actions/workflows/deploy.yaml/badge.svg)](https://github.com/hobroker/uptime/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-blue)](https://www.typescriptlang.org/)

**Uptime** is a lightweight, serverless monitoring tool built on **Cloudflare Workers** to keep track of your websites' availability. It monitors a configurable list of websites and sends **Telegram** alerts when issues arise—keeping you informed of your services' status at all times.

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

- 🔍 **Active Monitoring**: Periodically checks the availability of configured websites.
- ⚡ **Serverless**: Runs on Cloudflare Workers with minimal latency and no infrastructure overhead.
- 🔔 **Instant Alerts**: Sends alerts via Telegram when a monitor fails or recovers.
- 🔐 **Zero Trust Support**: Works with sites behind Cloudflare Zero Trust via client credentials.

## How It Works

1. Configure a list of websites to monitor in the project settings.
2. Uptime periodically checks the availability of each website.
3. If at least one website monitor fails, a notification is sent via Telegram.
4. No further failure notifications are sent for the same incident to avoid spam.
5. Once all monitors report a healthy status, a recovery message is sent via Telegram.

## Tech Stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) for development and deployment
- [TypeScript](https://www.typescriptlang.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- GitHub Actions (optional deployment)

## Getting Started

### Prerequisites

- A Cloudflare account
- A [Telegram bot](https://core.telegram.org/bots#how-do-i-create-a-bot) and a chat for notifications

### Environment Setup

1. Create a KV namespace for storing monitor states:
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
3. Optionally, set up Cloudflare Zero Trust if your websites are protected by it.
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
4. Configure your list of websites to monitor in the [configuration file](uptime.config.ts). Example:
   ```typescript
   export default {
     monitors: [
       {
         name: "Example Site",
         target: "https://example.com",
         statusPageLink: "https://status.example.com", // Optional: Link to a status page, defaults to the target URL
         expectedCodes: [200], // Optional: Expected HTTP status codes, defaults to [200]
         timeout: 5000, // Optional: Request timeout in milliseconds, defaults to 5000 ms
         protectedByZeroTrust: false, // Optional: Set to true if the site is protected by Cloudflare Zero Trust
         headers: {}, // Optional: Additional headers to send with the request
         body: undefined, // Optional: Body to send with the request (for POST or PUT requests)
       },
       // Add more monitors as needed
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

Once deployed, Uptime will automatically start monitoring the configured websites and send notifications to Telegram based on the status of the monitors.

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
