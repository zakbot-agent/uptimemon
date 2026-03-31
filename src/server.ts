import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, loadHistory } from "./storage";

const DASHBOARD_PORT = 3465;

export function startServer(port: number = DASHBOARD_PORT): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/api/data") {
      const config = loadConfig();
      const history = loadHistory();
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ config, history }));
      return;
    }

    // Serve dashboard
    const htmlPath = path.join(__dirname, "..", "public", "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(htmlPath, "utf-8"));
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(getEmbeddedDashboard());
    }
  });

  server.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });

  return server;
}

function getEmbeddedDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UptimeMon Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f1117;color:#e1e4e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px}
h1{font-size:1.6rem;margin-bottom:20px;color:#fff}
h2{font-size:1.1rem;margin:20px 0 10px;color:#8b949e}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:12px}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.8rem;font-weight:600}
.badge.up{background:#1a7f37;color:#3fb950}
.badge.down{background:#8b1a1a;color:#f85149}
.badge.pending{background:#5a4a00;color:#d29922}
.url{font-weight:600;font-size:1rem;margin-left:10px;color:#58a6ff}
.meta{color:#8b949e;font-size:.85rem;margin-top:6px}
.graph-container{margin-top:12px;height:80px;display:flex;align-items:flex-end;gap:1px;overflow:hidden}
.graph-bar{min-width:3px;flex:1;background:#238636;border-radius:1px 1px 0 0;transition:height .2s}
.graph-bar.fail{background:#f85149}
table{width:100%;border-collapse:collapse;font-size:.85rem}
table th{text-align:left;color:#8b949e;padding:6px 8px;border-bottom:1px solid #30363d}
table td{padding:6px 8px;border-bottom:1px solid #21262d}
.event-up{color:#3fb950}
.event-down{color:#f85149}
.refresh{color:#8b949e;font-size:.8rem;float:right}
</style>
</head>
<body>
<h1>UptimeMon <span class="refresh" id="refresh">auto-refresh 10s</span></h1>
<div id="targets"></div>
<h2>Event Log</h2>
<div class="card" id="events"><p class="meta">Loading...</p></div>
<script>
async function load(){
  try{
    const r=await fetch('/api/data');
    const d=await r.json();
    renderTargets(d);
    renderEvents(d);
  }catch(e){document.getElementById('targets').innerHTML='<p class="meta">Error loading data</p>'}
}

function renderTargets(d){
  const el=document.getElementById('targets');
  if(!d.config.targets.length){el.innerHTML='<div class="card"><p class="meta">No URLs monitored</p></div>';return}
  let html='';
  const now=Date.now();
  const h24=24*60*60*1000;
  for(const t of d.config.targets){
    const checks=d.history.checks.filter(c=>c.url===t.url);
    const recent=checks.filter(c=>now-new Date(c.timestamp).getTime()<h24);
    const last=checks.length?checks[checks.length-1]:null;
    const total=checks.length;
    const ok=checks.filter(c=>c.ok).length;
    const pct=total?(ok/total*100).toFixed(1):'N/A';
    const st=last?(last.ok?'up':'down'):'pending';
    const stLabel=st.toUpperCase();
    const resp=last?last.responseTime+'ms':'-';
    const lastTime=last?new Date(last.timestamp).toLocaleString():'-';
    // Graph bars
    let bars='';
    const graphData=recent.slice(-100);
    const maxRt=Math.max(...graphData.map(c=>c.responseTime),1);
    for(const c of graphData){
      const h=Math.max(4,Math.round((c.responseTime/maxRt)*70));
      bars+=\`<div class="graph-bar \${c.ok?'':'fail'}" style="height:\${h}px" title="\${c.responseTime}ms \${c.ok?'OK':'FAIL'}"></div>\`;
    }
    html+=\`<div class="card">
      <span class="badge \${st}">\${stLabel}</span>
      <span class="url">\${t.url}</span>
      <div class="meta">Response: \${resp} &middot; Uptime: \${pct}% &middot; Interval: \${t.interval}s &middot; Last: \${lastTime}</div>
      <div class="graph-container">\${bars||'<span class="meta">No data yet</span>'}</div>
    </div>\`;
  }
  el.innerHTML=html;
}

function renderEvents(d){
  const el=document.getElementById('events');
  const evts=d.history.events.slice(-50).reverse();
  if(!evts.length){el.innerHTML='<p class="meta">No events</p>';return}
  let html='<table><tr><th>Time</th><th>Status</th><th>URL</th><th>Details</th></tr>';
  for(const e of evts){
    const cls=e.type==='up'?'event-up':'event-down';
    const detail=e.error||(\`\${e.status} \${e.responseTime}ms\`);
    html+=\`<tr><td>\${new Date(e.timestamp).toLocaleString()}</td><td class="\${cls}">\${e.type.toUpperCase()}</td><td>\${e.url}</td><td>\${detail}</td></tr>\`;
  }
  html+='</table>';
  el.innerHTML=html;
}

load();
setInterval(load,10000);
</script>
</body>
</html>`;
}
