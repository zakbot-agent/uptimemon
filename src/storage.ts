import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const BASE_DIR = path.join(os.homedir(), ".uptimemon");
const CONFIG_PATH = path.join(BASE_DIR, "config.json");
const HISTORY_PATH = path.join(BASE_DIR, "history.json");
const PID_PATH = path.join(BASE_DIR, "uptimemon.pid");

export interface MonitorTarget {
  url: string;
  interval: number; // seconds
  method: string;
  expect: number;
  addedAt: string;
}

export interface CheckResult {
  url: string;
  timestamp: string;
  status: number | null;
  responseTime: number; // ms
  ok: boolean;
  error?: string;
}

export interface EventEntry {
  url: string;
  timestamp: string;
  type: "up" | "down";
  status: number | null;
  responseTime: number;
  error?: string;
}

export interface Config {
  targets: MonitorTarget[];
}

export interface History {
  checks: CheckResult[];
  events: EventEntry[];
}

function ensureDir(): void {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  ensureDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { targets: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return { targets: [] };
  }
}

export function saveConfig(config: Config): void {
  ensureDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function loadHistory(): History {
  ensureDir();
  if (!fs.existsSync(HISTORY_PATH)) {
    return { checks: [], events: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
  } catch {
    return { checks: [], events: [] };
  }
}

export function saveHistory(history: History): void {
  ensureDir();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

export function addCheck(result: CheckResult): void {
  const history = loadHistory();
  history.checks.push(result);
  // Keep last 10000 checks max
  if (history.checks.length > 10000) {
    history.checks = history.checks.slice(-10000);
  }
  saveHistory(history);
}

export function addEvent(event: EventEntry): void {
  const history = loadHistory();
  history.events.push(event);
  // Keep last 5000 events
  if (history.events.length > 5000) {
    history.events = history.events.slice(-5000);
  }
  saveHistory(history);
}

export function getLastStatus(url: string): boolean | null {
  const history = loadHistory();
  const events = history.events.filter((e) => e.url === url);
  if (events.length === 0) return null;
  return events[events.length - 1].type === "up";
}

export function writePid(pid: number): void {
  ensureDir();
  fs.writeFileSync(PID_PATH, String(pid));
}

export function readPid(): number | null {
  if (!fs.existsSync(PID_PATH)) return null;
  try {
    return parseInt(fs.readFileSync(PID_PATH, "utf-8").trim(), 10);
  } catch {
    return null;
  }
}

export function removePid(): void {
  if (fs.existsSync(PID_PATH)) {
    fs.unlinkSync(PID_PATH);
  }
}

export function getBaseDir(): string {
  return BASE_DIR;
}

export function getPidPath(): string {
  return PID_PATH;
}
