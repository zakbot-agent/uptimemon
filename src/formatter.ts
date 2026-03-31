import { MonitorTarget, CheckResult, EventEntry, History } from "./storage";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export function formatList(targets: MonitorTarget[]): string {
  if (targets.length === 0) return `${DIM}No URLs monitored.${RESET}`;
  const lines = [`${BOLD}Monitored URLs:${RESET}`, ""];
  for (const t of targets) {
    lines.push(
      `  ${CYAN}${t.url}${RESET}  ${DIM}method=${t.method} expect=${t.expect} interval=${t.interval}s${RESET}`
    );
  }
  return lines.join("\n");
}

export function formatStatus(
  targets: MonitorTarget[],
  history: History
): string {
  if (targets.length === 0) return `${DIM}No URLs monitored.${RESET}`;
  const lines = [`${BOLD}Status:${RESET}`, ""];

  for (const t of targets) {
    const checks = history.checks.filter((c) => c.url === t.url);
    const lastCheck = checks.length > 0 ? checks[checks.length - 1] : null;
    const totalChecks = checks.length;
    const okChecks = checks.filter((c) => c.ok).length;
    const uptimePct = totalChecks > 0 ? ((okChecks / totalChecks) * 100).toFixed(1) : "N/A";
    const statusIcon = lastCheck ? (lastCheck.ok ? `${GREEN}UP${RESET}` : `${RED}DOWN${RESET}`) : `${YELLOW}PENDING${RESET}`;
    const respTime = lastCheck ? `${lastCheck.responseTime}ms` : "-";
    const lastTime = lastCheck ? lastCheck.timestamp : "-";

    lines.push(`  ${statusIcon}  ${CYAN}${t.url}${RESET}`);
    lines.push(
      `       ${DIM}Response: ${respTime}  Uptime: ${uptimePct}%  Last: ${lastTime}${RESET}`
    );
    lines.push("");
  }
  return lines.join("\n");
}

export function formatLog(events: EventEntry[], limit: number = 30): string {
  if (events.length === 0) return `${DIM}No events recorded.${RESET}`;
  const recent = events.slice(-limit).reverse();
  const lines = [`${BOLD}Recent Events:${RESET}`, ""];
  for (const e of recent) {
    const icon = e.type === "up" ? `${GREEN}UP${RESET}` : `${RED}DOWN${RESET}`;
    const detail = e.error ? ` ${DIM}(${e.error})${RESET}` : ` ${DIM}(${e.status} ${e.responseTime}ms)${RESET}`;
    lines.push(`  ${DIM}${e.timestamp}${RESET}  ${icon}  ${CYAN}${e.url}${RESET}${detail}`);
  }
  return lines.join("\n");
}
