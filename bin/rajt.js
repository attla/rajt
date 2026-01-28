#!/usr/bin/env node
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(new URL(import.meta.url).pathname);

const ERR_NODE_VERSION = "18.0.0";
const MIN_NODE_VERSION = "18.0.0";

let rajtProcess;

function runRajt() {
  if (process?.versions?.node && semiver(process.versions.node, ERR_NODE_VERSION) < 0) {
    console.error(
      `Rajt requires at least Node.js v${MIN_NODE_VERSION}. You are using v${process.versions.node}. Please update your version of Node.js.

Consider using a Node.js version manager such as https://volta.sh or https://github.com/nvm-sh/nvm.`
    );
    process.exitCode = 1;
    return;
  }

  const isBun = process?.isBun || typeof Bun != 'undefined';
  let tsxPath;
  // const params = isBun ? bunParams() : nodeParams();

  if (!isBun) {
    const tsxPaths = [
      // join(__dirname, "../node_modules/.bin/tsx"),
      // join(__dirname, "../../.bin/tsx"),
      join(__dirname, "../node_modules/.bin/tsx"),
      join(__dirname, "../../node_modules/.bin/tsx"),
      join(process.cwd(), "node_modules/.bin/tsx"),
      "tsx",
    ];

    for (const pathOption of tsxPaths) {
      if (pathOption == "tsx" || existsSync(pathOption)) {
        tsxPath = pathOption;
        break;
      }
    }

    if (!tsxPath) {
      console.error("TypeScript file found but tsx is not available. Please install tsx:");
      console.error("  npm i -D tsx");
      console.error("  or");
      console.error("  bun i -D tsx");
      process.exit(1);
      return;
    }
  }

  return spawn(
    process.execPath,
    [
      "--no-warnings",
      ...process.execArgv,
      tsxPath,
      join(__dirname, "../src/cli/index.ts"),
      ...process.argv.slice(2),
    ].filter(arg => arg && !arg.includes('experimental-vm-modules') && !arg.includes('loader')),
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        TSX_DISABLE_CACHE: process.env.TSX_DISABLE_CACHE || '1',
      }
    }
  ).on("exit", (code) =>
    process.exit(code == null ? 0 : code)
  ).on("message", (message) => {
    if (process.send) {
      process.send(message);
    }
  }).on("disconnect", () => {
    if (process.disconnect) {
      process.disconnect();
    }
  });
}

var fn = new Intl.Collator(0, { numeric: 1 }).compare;

function semiver(a, b, bool) {
  a = a.split(".");
  b = b.split(".");

  return (
    fn(a[0], b[0]) ||
    fn(a[1], b[1]) ||
    ((b[2] = b.slice(2).join(".")),
      (bool = /[.-]/.test((a[2] = a.slice(2).join(".")))),
      bool == /[.-]/.test(b[2]) ? fn(a[2], b[2]) : bool ? -1 : 1)
  );
}

function directly() {
  try {
    return process.env?.npm_lifecycle_script == 'rajt'
      && (
        process.argv[1]?.endsWith('node_modules/.bin/rajt')
        || process.argv[1]?.endsWith('node_modules/rajt/bin/rajt.js')
      )
  } catch {
    return false
  }
}

if (directly()) {
  rajtProcess = runRajt();
  process.on("SIGINT", () => {
    rajtProcess && rajtProcess.kill();
  });
  process.on("SIGTERM", () => {
    rajtProcess && rajtProcess.kill();
  });
}
