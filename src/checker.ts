import * as http from "http";
import * as https from "https";
import { MonitorTarget, CheckResult } from "./storage";

export function checkUrl(target: MonitorTarget): Promise<CheckResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(target.url);
    const isHttps = url.protocol === "https:";
    const mod = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: target.method,
      timeout: 30000,
      headers: {
        "User-Agent": "uptimemon/1.0",
      },
    };

    try {
      const req = mod.request(options, (res) => {
        // Consume response body
        res.on("data", () => {});
        res.on("end", () => {
          const responseTime = Date.now() - start;
          const status = res.statusCode || 0;
          const ok = status === target.expect;
          resolve({
            url: target.url,
            timestamp: new Date().toISOString(),
            status,
            responseTime,
            ok,
          });
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          url: target.url,
          timestamp: new Date().toISOString(),
          status: null,
          responseTime: Date.now() - start,
          ok: false,
          error: "Timeout (30s)",
        });
      });

      req.on("error", (err: Error) => {
        resolve({
          url: target.url,
          timestamp: new Date().toISOString(),
          status: null,
          responseTime: Date.now() - start,
          ok: false,
          error: err.message,
        });
      });

      req.end();
    } catch (err: any) {
      resolve({
        url: target.url,
        timestamp: new Date().toISOString(),
        status: null,
        responseTime: Date.now() - start,
        ok: false,
        error: err.message || "Unknown error",
      });
    }
  });
}
