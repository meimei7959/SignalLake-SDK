import { createHttpRelayServer } from "./http-server.mjs";
import { createFileRelayStore } from "./file-relay-store.mjs";
import { loadRelayConfig } from "./config.mjs";

const config = loadRelayConfig();
const store = config.storePath
  ? createFileRelayStore({
      filePath: config.storePath,
      maxAttempts: config.maxAttempts
    })
  : undefined;
const server = createHttpRelayServer({ store, token: config.token });

server.listen(config.port, () => {
  console.log(
    `SignalLake relay listening on http://localhost:${config.port} mode=${config.mode}`
  );
});
