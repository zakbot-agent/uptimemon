import { checkUrl } from "./checker";
import {
  loadConfig,
  loadHistory,
  addCheck,
  addEvent,
  getLastStatus,
  MonitorTarget,
} from "./storage";

const timers: Map<string, ReturnType<typeof setInterval>> = new Map();

export function startMonitoring(onCheck?: (url: string, ok: boolean) => void): void {
  const config = loadConfig();

  for (const target of config.targets) {
    scheduleTarget(target, onCheck);
  }
}

function scheduleTarget(
  target: MonitorTarget,
  onCheck?: (url: string, ok: boolean) => void
): void {
  // Run immediately
  runCheck(target, onCheck);

  // Then on interval
  const timer = setInterval(
    () => runCheck(target, onCheck),
    target.interval * 1000
  );
  timers.set(target.url, timer);
}

async function runCheck(
  target: MonitorTarget,
  onCheck?: (url: string, ok: boolean) => void
): Promise<void> {
  const result = await checkUrl(target);
  addCheck(result);

  // Detect transitions
  const prevStatus = getLastStatus(target.url);
  if (prevStatus === null || prevStatus !== result.ok) {
    addEvent({
      url: target.url,
      timestamp: result.timestamp,
      type: result.ok ? "up" : "down",
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
    });
  }

  if (onCheck) onCheck(target.url, result.ok);
}

export function stopMonitoring(): void {
  for (const [, timer] of timers) {
    clearInterval(timer);
  }
  timers.clear();
}

export async function runOnce(): Promise<void> {
  const config = loadConfig();
  for (const target of config.targets) {
    const result = await checkUrl(target);
    addCheck(result);
    const prevStatus = getLastStatus(target.url);
    if (prevStatus === null || prevStatus !== result.ok) {
      addEvent({
        url: target.url,
        timestamp: result.timestamp,
        type: result.ok ? "up" : "down",
        status: result.status,
        responseTime: result.responseTime,
        error: result.error,
      });
    }
  }
}
