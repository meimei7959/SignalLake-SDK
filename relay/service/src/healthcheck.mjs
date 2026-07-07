import { loadRelayConfig } from "./config.mjs";

const config = loadRelayConfig();
const url = `http://127.0.0.1:${config.port}/readyz`;
const response = await fetch(url, {
  headers: config.token ? { authorization: `Bearer ${config.token}` } : {}
});

if (!response.ok) {
  console.error(`SignalLake relay healthcheck failed: ${response.status}`);
  process.exit(1);
}

const body = await response.json();
if (!body.ok) {
  console.error("SignalLake relay healthcheck returned not ready");
  process.exit(1);
}

console.log(`SignalLake relay ready: store=${body.store}`);
