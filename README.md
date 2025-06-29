# Uptime - Website Monitoring with Cloudflare Workers

**Uptime** is a lightweight, serverless monitoring tool built on **Cloudflare Workers** to keep track of your websites' availability. It checks a configurable list of websites and notifies you via **Telegram** when issues arise, ensuring you're always informed about your services' status.

## Features

- **Website Monitoring**: Monitors a user-defined list of websites.
- **Cloudflare Workers**: Runs on Cloudflare Workers.
- **Telegram Notifications**: Sends alerts to a specified Telegram chat or channel when at least one monitored website fails.
- **Cloudflare Zero Trust Support**: Compatible with websites protected by Cloudflare Zero Trust.

## How It Works

1. Configure a list of websites to monitor in the project settings.
2. Uptime periodically checks the availability of each website.
3. If at least one website monitor fails, a notification is sent via Telegram.
4. No further failure notifications are sent for the same incident to avoid spam.
5. Once all monitors report a healthy status, a recovery message is sent via Telegram.

## Getting Started

### Prerequisites

- A Cloudflare account
- A Telegram bot and a chat for notifications

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
         timeout: 10000, // Optional: Request timeout in milliseconds, defaults to 10000 ms
       },
       // Add more monitors as needed
     ],
   };
   ```
5. Create a KV namespace for storing monitor states:
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
6. Add the Telegram secrets to your Cloudflare Workers environment variables:
   ```shell
   cd packages/uptime-worker/
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_CHAT_ID
   ```
7. Optionally, set up Cloudflare Zero Trust if your websites are protected by it.
   ```shell
   cd packages/uptime-worker/
   wrangler secret put CF_ACCESS_CLIENT_ID
   wrangler secret put CF_ACCESS_CLIENT_SECRET
   ```
8. Deploy the project to Cloudflare Workers:
   ```shell
   npm run deploy
   ```

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
4. Test the worker locally by calling the scheduled endpoint:
   ```shell
   curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
   ```

### Deployment

Deploy Uptime to Cloudflare Workers using the following command:

```shell
npm run deploy
```

## Usage

Once deployed, Uptime will automatically start monitoring the configured websites and send notifications to Telegram based on the status of the monitors.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests to improve Uptime.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). See the [LICENSE](LICENSE) file for details.
