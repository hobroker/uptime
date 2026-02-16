import { execSync, exec } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import {
  intro,
  confirm,
  text,
  spinner,
  log,
  isCancel,
  group,
  outro,
} from "@clack/prompts";
import pc from "picocolors";

import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const setupCancelError = new Error("Setup cancelled.");

export async function main() {
  intro(`${pc.bgCyan(pc.black(" Uptime Setup "))}`);

  const projectDir = join(process.cwd(), "../..");
  const workerDir = join(projectDir, "packages/uptime-worker");
  const wranglerPath = join(workerDir, "wrangler.jsonc");

  // 1. Check Cloudflare Login Status
  let isLoggedIn = false;
  let userEmail = "";

  const loginSpinner = spinner();
  loginSpinner.start("Checking Cloudflare login status...");
  try {
    const { stdout } = await execAsync("npx wrangler whoami", {
      encoding: "utf8",
    });
    if (stdout.includes("You are logged in") || stdout.includes("(redacted)")) {
      isLoggedIn = true;
    }

    loginSpinner.stop(
      isLoggedIn
        ? `Logged in to ${pc.cyan("Cloudflare")}`
        : "Not logged in to Cloudflare",
    );
  } catch (e) {
    loginSpinner.stop("Not logged in to Cloudflare");
  }

  if (!isLoggedIn) {
    const shouldLogin = await confirm({
      message:
        "You are not logged in. Would you like to login to Cloudflare now?",
      initialValue: true,
    });

    if (isCancel(shouldLogin)) throw setupCancelError;

    if (shouldLogin) {
      try {
        execSync("npx wrangler login", { stdio: "inherit" });
      } catch (e) {
        log.error(
          'Login failed. You might need to run "npx wrangler login" manually.',
        );
      }
    }
  }

  // 2. Project Name
  let currentProjectName = "uptime-worker";
  try {
    const wranglerConfig = JSON.parse(
      readFileSync(wranglerPath, "utf8").replace(/\/\/.*$/gm, ""),
    );
    currentProjectName = wranglerConfig.name || "uptime-worker";
  } catch (e) {}

  const projectName = await text({
    message: "What should be the name of your project on Cloudflare?",
    placeholder: currentProjectName,
    defaultValue: currentProjectName,
    initialValue: currentProjectName,
    validate: (value) => {
      if (value.length === 0) return "Project name is required";
      if (!/^[a-z0-9-]+$/.test(value))
        return "Project name must be lowercase, numbers, and hyphens only";
    },
  });

  if (isCancel(projectName)) throw setupCancelError;

  if (projectName !== currentProjectName) {
    const s = spinner();
    s.start(`Updating project name to ${pc.cyan(projectName)}...`);

    // Update wrangler.jsonc
    let wranglerContent = readFileSync(wranglerPath, "utf8");
    wranglerContent = wranglerContent.replace(
      /"name":\s*"[^"]*"/,
      `"name": "${projectName}"`,
    );
    writeFileSync(wranglerPath, wranglerContent);

    s.stop(`Project name updated to ${pc.cyan(projectName)}`);
  }

  // 3. KV Namespace
  const kvSpinner = spinner();
  kvSpinner.start("Checking for KV namespace configuration...");
  try {
    const { stdout: listOutput } = await execAsync(
      "npx wrangler kv namespace list",
      {
        encoding: "utf8",
        cwd: workerDir,
      },
    );
    const namespaces = JSON.parse(listOutput) as {
      title: string;
      id: string;
    }[];
    // Look for a namespace associated with this project name or generic 'uptime'
    const existingKV = namespaces.find(
      (kv) => kv.title === `${projectName}-uptime` || kv.title === "uptime",
    );

    if (existingKV) {
      kvSpinner.stop(
        `Found KV namespace: ${pc.cyan(existingKV.title)} (${pc.green(existingKV.id)})`,
      );

      let content = readFileSync(wranglerPath, "utf8");
      content = content.replace(
        /("binding":\s*"uptime",\s*"id":\s*")[a-f0-9]+"/,
        `$1${existingKV.id}"`,
      );
      writeFileSync(wranglerPath, content);
      log.success(`Updated wrangler.jsonc with KV ID.`);
    } else {
      kvSpinner.stop("No matching KV namespace found.");

      const s = spinner();
      s.start("Creating KV namespace...");
      const { stdout: output } = await execAsync(
        "npx wrangler kv namespace create uptime",
        {
          encoding: "utf8",
          cwd: workerDir,
        },
      );
      const idMatch = output.match(/id = "([a-f0-9]+)"/);

      if (idMatch && existsSync(wranglerPath)) {
        const kvId = idMatch[1];
        let content = readFileSync(wranglerPath, "utf8");
        content = content.replace(
          /("binding":\s*"uptime",\s*"id":\s*")[a-f0-9]+"/,
          `$1${kvId}"`,
        );
        writeFileSync(wranglerPath, content);
        s.stop(`Created KV and updated wrangler.jsonc (ID: ${pc.green(kvId)})`);
      } else {
        s.stop(
          pc.yellow(
            "Created KV, but could not automatically update wrangler.jsonc.",
          ),
        );
      }
    }
  } catch (e) {
    kvSpinner.stop(pc.red("Failed to check KV namespaces."));
  }

  // 4. Secrets
  const setupSecrets = await confirm({
    message:
      "Would you like to configure Cloudflare secrets (Telegram, etc.) now?",
    initialValue: false,
  });

  if (setupSecrets) {
    const secretsGroup = await group({
      TELEGRAM_BOT_TOKEN: () =>
        text({
          message: "Enter TELEGRAM_BOT_TOKEN",
        }),
      TELEGRAM_CHAT_ID: () =>
        text({
          message: "Enter TELEGRAM_CHAT_ID",
        }),
      STATUSPAGE_IO_API_KEY: () =>
        text({
          message: "Enter STATUSPAGE_IO_API_KEY",
          placeholder: "Optional",
        }),
      STATUSPAGE_IO_PAGE_ID: () =>
        text({
          message: "Enter STATUSPAGE_IO_PAGE_ID",
          placeholder: "Optional",
        }),
    });

    if (isCancel(secretsGroup)) throw setupCancelError;

    const s = spinner();
    s.start("Setting secrets...");
    for (const [key, value] of Object.entries(secretsGroup)) {
      if (value && typeof value === "string") {
        try {
          // wrangler secret put requires input on stdin, so execSync with 'input' is appropriate here.
          execSync(`npx wrangler secret put ${key}`, {
            input: value,
            stdio: ["pipe", "ignore", "ignore"],
            cwd: workerDir,
          });
        } catch (e) {
          log.error(`Failed to set secret ${key}`);
        }
      }
    }
    s.stop("Secrets configuration finished.");
  }

  // 5. Local Environment
  const devVarsPath = join(workerDir, ".dev.vars");
  const devVarsExamplePath = join(workerDir, ".dev.vars.example");

  if (!existsSync(devVarsPath) && existsSync(devVarsExamplePath)) {
    writeFileSync(devVarsPath, readFileSync(devVarsExamplePath));
    log.success("Created .dev.vars for local development.");
  }

  // 6. Types
  const tsSpinner = spinner();
  tsSpinner.start("Generating types...");
  try {
    await execAsync("npm run cf-typegen", { cwd: workerDir });
    tsSpinner.stop("Types generated!");
  } catch (e) {
    tsSpinner.stop(pc.red("Failed to generate types."));
  }

  outro(`✨ ${pc.cyan("Setup complete!")} 

${pc.white("Next steps:")}
1. Edit ${pc.green("packages/uptime-worker/uptime.config.ts")}
2. Run ${pc.green("npm run deploy")}
`);
}

const isMain =
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);

if (isMain) {
  main().catch((error) => {
    if (error === setupCancelError) {
      process.exit(0);
    }
    console.error(error);
    process.exit(1);
  });
}
