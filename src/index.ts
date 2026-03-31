#!/usr/bin/env node

import {
  loadConfig,
  saveConfig,
  loadHistory,
  writePid,
  readPid,
  removePid,
  getPidPath,
  MonitorTarget,
} from "./storage";
import { startMonitoring, stopMonitoring, runOnce } from "./monitor";
import { startServer } from "./server";
import { formatList, formatStatus, formatLog } from "./formatter";
import * as child_process from "child_process";
import * as process from "process";

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

function usage(): void {
  console.log(`
uptimemon - Simple uptime monitor

Commands:
  add <url>              Add URL to monitor
    --interval <sec>     Check interval (default: 60)
    --method <METHOD>    HTTP method (default: GET)
    --expect <code>      Expected status code (default: 200)
  remove <url>           Remove URL from monitoring
  list                   List monitored URLs
  start                  Start monitoring (foreground)
    --daemon             Run in background
    --serve              Enable web dashboard on :3465
  stop                   Stop daemon
  status                 Show status of all URLs
  log                    Show recent events
  `);
}

async function main(): Promise<void> {
  if (!command) {
    usage();
    process.exit(0);
  }

  switch (command) {
    case "add": {
      const url = args[1];
      if (!url) {
        console.error("Error: URL required. Usage: uptimemon add <url>");
        process.exit(1);
      }
      // Validate URL
      try {
        new URL(url);
      } catch {
        console.error("Error: Invalid URL");
        process.exit(1);
      }
      const interval = parseInt(getFlag("--interval") || "60", 10);
      const method = (getFlag("--method") || "GET").toUpperCase();
      const expect = parseInt(getFlag("--expect") || "200", 10);

      const config = loadConfig();
      const existing = config.targets.find((t) => t.url === url);
      if (existing) {
        existing.interval = interval;
        existing.method = method;
        existing.expect = expect;
        saveConfig(config);
        console.log(`Updated: ${url}`);
      } else {
        const target: MonitorTarget = {
          url,
          interval,
          method,
          expect,
          addedAt: new Date().toISOString(),
        };
        config.targets.push(target);
        saveConfig(config);
        console.log(`Added: ${url} (every ${interval}s, ${method}, expect ${expect})`);
      }
      break;
    }

    case "remove": {
      const url = args[1];
      if (!url) {
        console.error("Error: URL required.");
        process.exit(1);
      }
      const config = loadConfig();
      const before = config.targets.length;
      config.targets = config.targets.filter((t) => t.url !== url);
      if (config.targets.length === before) {
        console.error(`Not found: ${url}`);
        process.exit(1);
      }
      saveConfig(config);
      console.log(`Removed: ${url}`);
      break;
    }

    case "list": {
      const config = loadConfig();
      console.log(formatList(config.targets));
      break;
    }

    case "start": {
      const isDaemon = hasFlag("--daemon");
      const withServe = hasFlag("--serve");

      if (isDaemon) {
        // Spawn detached child
        const childArgs = ["start"];
        if (withServe) childArgs.push("--serve");

        const child = child_process.spawn(
          process.execPath,
          [__filename, ...childArgs],
          {
            detached: true,
            stdio: "ignore",
          }
        );
        child.unref();
        writePid(child.pid!);
        console.log(`Daemon started (PID: ${child.pid})`);
        if (withServe) console.log("Dashboard: http://localhost:3465");
        process.exit(0);
      }

      // Foreground mode
      console.log("Starting monitor...");
      const config = loadConfig();
      if (config.targets.length === 0) {
        console.log("No URLs to monitor. Use: uptimemon add <url>");
        process.exit(0);
      }

      if (withServe) {
        startServer(3465);
      }

      startMonitoring((url, ok) => {
        const icon = ok ? "\x1b[32m[UP]\x1b[0m" : "\x1b[31m[DOWN]\x1b[0m";
        console.log(`${new Date().toISOString()} ${icon} ${url}`);
      });

      // Handle shutdown
      const shutdown = () => {
        console.log("\nStopping...");
        stopMonitoring();
        removePid();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
      break;
    }

    case "stop": {
      const pid = readPid();
      if (!pid) {
        console.log("No daemon running.");
        process.exit(0);
      }
      try {
        process.kill(pid, "SIGTERM");
        removePid();
        console.log(`Stopped daemon (PID: ${pid})`);
      } catch {
        removePid();
        console.log("Daemon not running (cleaned up PID file).");
      }
      break;
    }

    case "status": {
      const config = loadConfig();
      const history = loadHistory();
      console.log(formatStatus(config.targets, history));
      break;
    }

    case "log": {
      const history = loadHistory();
      console.log(formatLog(history.events));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
