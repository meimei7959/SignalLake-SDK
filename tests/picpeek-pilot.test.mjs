import test from "node:test";
import assert from "node:assert/strict";
import { runPicPeekDryRunPilot } from "../pilots/picpeek/run-dry-run.mjs";

test("PicPeek dry-run pilot proves encrypted event and relay path", async () => {
  const report = await runPicPeekDryRunPilot();

  assert.equal(report.pass, true);
  assert.equal(report.uploadPayload, "encrypted");
  assert.equal(report.uploadedSchemaVersion, "signallake.encrypted-event-batch.v1");
  assert.deepEqual(report.emittedEvents, [
    "app.opened",
    "screen.viewed",
    "command.invoked",
    "error.occurred"
  ]);
  assert.equal(report.eventCount, 4);
  assert.equal(report.privacyRejections.length, 2);
  assert.equal(report.relay.uploadStatus, 202);
  assert.equal(report.relay.deliveryCount, 1);
  assert.equal(report.relay.ackStatus, 200);
});
