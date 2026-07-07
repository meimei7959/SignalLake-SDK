import http from "node:http";
import { URL } from "node:url";
import { createRelayService } from "./index.mjs";

export function createHttpRelayServer(options = {}) {
  const relay = options.relay ?? createRelayService(options);
  const token = options.token ?? process.env.SIGNALLAKE_RELAY_TOKEN;

  return http.createServer(async (request, response) => {
    try {
      if (token && request.headers.authorization !== `Bearer ${token}`) {
        return writeJson(response, 401, {
          ok: false,
          errorCode: "SIGNALLAKE_AUTH_UNAUTHORIZED"
        });
      }

      const url = new URL(request.url, "http://localhost");

      if (request.method === "GET" && url.pathname === "/healthz") {
        return writeJson(response, 200, { ok: true });
      }

      if (request.method === "GET" && url.pathname === "/readyz") {
        return writeJson(response, 200, relay.ready());
      }

      if (request.method === "POST" && url.pathname === "/v1/upload") {
        const result = relay.upload(await readJson(request));
        return writeJson(response, result.status, result);
      }

      if (request.method === "GET" && url.pathname === "/v1/delivery/pull") {
        const limit = Number(url.searchParams.get("limit") ?? 10);
        const result = relay.pull(limit);
        return writeJson(response, result.status, result);
      }

      if (request.method === "POST" && url.pathname === "/v1/delivery/ack") {
        const body = await readJson(request);
        const result = relay.ack(body.deliveryId);
        return writeJson(response, result.status, result);
      }

      if (request.method === "POST" && url.pathname === "/v1/delivery/nack") {
        const body = await readJson(request);
        const result = relay.nack(body.deliveryId);
        return writeJson(response, result.status, result);
      }

      if (request.method === "GET" && url.pathname === "/v1/stats") {
        return writeJson(response, 200, {
          ok: true,
          stats: relay.stats()
        });
      }

      if (request.method === "GET" && url.pathname === "/v1/metrics") {
        return writeJson(response, 200, {
          ok: true,
          metrics: relay.metrics()
        });
      }

      if (request.method === "GET" && url.pathname === "/metrics") {
        return writeText(response, 200, relay.metricsText());
      }

      if (request.method === "POST" && url.pathname === "/v1/retention/prune") {
        const result = relay.pruneRetention(await readJson(request));
        return writeJson(response, result.status, result);
      }

      return writeJson(response, 404, {
        ok: false,
        errorCode: "SIGNALLAKE_ROUTE_NOT_FOUND"
      });
    } catch (error) {
      return writeJson(response, 500, {
        ok: false,
        errorCode: "SIGNALLAKE_INTERNAL_ERROR",
        message: error.message
      });
    }
  });
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

function writeText(response, status, body) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8"
  });
  response.end(body);
}
