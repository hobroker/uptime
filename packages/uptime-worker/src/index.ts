import { updateUptimeKV } from "./updateUptimeKV";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    url.pathname = "/__scheduled";
    url.searchParams.append("cron", "* * * * *");
    return new Response(
      `To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`
    );
  },

  async scheduled(event, env): Promise<void> {
    await updateUptimeKV({ env });
    console.log(`trigger fired at ${event.cron}`);
  },
} satisfies ExportedHandler<Env>;
