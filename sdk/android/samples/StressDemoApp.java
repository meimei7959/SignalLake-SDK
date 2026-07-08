package dev.signallake.samples;

import dev.signallake.EncryptedBatchUploader;
import dev.signallake.FlushResult;
import dev.signallake.Identity;
import dev.signallake.SignalLake;
import dev.signallake.SignalLakeClient;
import dev.signallake.SignalLakeCommonValues;
import dev.signallake.SignalLakeConfig;
import dev.signallake.SignalLakeEncryptionKey;
import dev.signallake.SignalLakeEventCatalog;
import dev.signallake.SignalLakeEventDefinition;
import dev.signallake.SignalLakeProperties;
import dev.signallake.SignalLakePropertyDefinition;
import dev.signallake.SignalLakeQueuePolicy;
import dev.signallake.SignalLakeStoragePolicy;
import dev.signallake.Source;
import dev.signallake.EncryptedEventBatch;
import dev.signallake.UploadResult;

import java.io.File;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

public final class StressDemoApp {
    private final FakeUploader uploader = new FakeUploader();
    private final SignalLakeClient analytics;

    public StressDemoApp(File appPrivateQueueDirectory, byte[] encryptionKey) {
        SignalLakeConfig config = new SignalLakeConfig.Builder()
                .source(new Source(
                        "app.signallake.stress",
                        "SignalLake-Stress",
                        "signallake-android",
                        "0.0.0-stress",
                        "android",
                        "0.0.0-stress",
                        "test"))
                .identity(new Identity("stress-anon", "stress-device"))
                .session("stress-session", "2026-07-08T00:00:00.000Z")
                .eventCatalog(stressCatalog())
                .encryptionKey(new SignalLakeEncryptionKey("stress-local-aes-256-gcm", encryptionKey))
                .queuePolicy(new SignalLakeQueuePolicy(200, 10, SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST))
                .diskQueue(
                        appPrivateQueueDirectory,
                        new SignalLakeStoragePolicy(
                                1024L * 1024L,
                                40,
                                SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST))
                .uploader(uploader)
                .build();
        analytics = SignalLake.start(config);
    }

    public StressResult runOfflineBurst(int eventCount) {
        uploader.mode = Mode.OFFLINE;
        long maxTrackNanos = 0;
        for (int index = 0; index < eventCount; index++) {
            long started = System.nanoTime();
            analytics.trackCommandInvoked("stress.run", stressProperties());
            maxTrackNanos = Math.max(maxTrackNanos, System.nanoTime() - started);
            if ((index + 1) % 10 == 0) analytics.flush();
        }
        analytics.flush();
        return new StressResult(eventCount, analytics.queuedCount(), maxTrackNanos, uploader.uploadCount.get(), uploader.maxInFlight.get());
    }

    public StressResult runSlowFlushPressure(int flushCount) throws Exception {
        uploader.mode = Mode.SLOW_SUCCESS;
        Future<FlushResult> last = null;
        for (int index = 0; index < flushCount; index++) {
            analytics.trackCommandInvoked("stress.slow", stressProperties());
            last = analytics.flush();
        }
        if (last != null) last.get();
        return new StressResult(flushCount, analytics.queuedCount(), 0, uploader.uploadCount.get(), uploader.maxInFlight.get());
    }

    public StressResult recoverUploads(int maxFlushes) throws Exception {
        uploader.mode = Mode.SUCCESS;
        Future<FlushResult> last = null;
        for (int index = 0; index < maxFlushes; index++) {
            last = analytics.flush();
            if (last.get().status == FlushResult.Status.EMPTY) break;
        }
        return new StressResult(maxFlushes, analytics.queuedCount(), 0, uploader.uploadCount.get(), uploader.maxInFlight.get());
    }

    private static Map<String, Object> stressProperties() {
        return SignalLakeProperties.builder()
                .outcome(SignalLakeCommonValues.Outcome.SUCCESS)
                .build();
    }

    private static SignalLakeEventCatalog stressCatalog() {
        return new SignalLakeEventCatalog(
                "signallake.catalog.stress.v1",
                "SignalLake-Stress",
                "app.signallake.stress",
                SignalLakeEventDefinition.STATUS_ACTIVE,
                Arrays.asList(new SignalLakeEventDefinition(
                        "command.invoked",
                        "command",
                        "behavioral",
                        SignalLakeEventDefinition.STATUS_ACTIVE,
                        Arrays.asList(
                                new SignalLakePropertyDefinition(
                                        "commandId",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        true,
                                        null),
                                new SignalLakePropertyDefinition(
                                        "outcome",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList("success", "failure", "unknown"))))));
    }

    public enum Mode {
        OFFLINE,
        SLOW_SUCCESS,
        SUCCESS
    }

    private static final class FakeUploader implements EncryptedBatchUploader {
        volatile Mode mode = Mode.SUCCESS;
        final AtomicInteger inFlight = new AtomicInteger();
        final AtomicInteger maxInFlight = new AtomicInteger();
        final AtomicInteger uploadCount = new AtomicInteger();

        @Override
        public UploadResult upload(EncryptedEventBatch batch) {
            int active = inFlight.incrementAndGet();
            maxInFlight.set(Math.max(maxInFlight.get(), active));
            uploadCount.incrementAndGet();
            try {
                if (mode == Mode.SLOW_SUCCESS) Thread.sleep(50);
                if (mode == Mode.SUCCESS || mode == Mode.SLOW_SUCCESS) {
                    return new UploadResult(true, 202, "accepted");
                }
                return new UploadResult(false, 0, "offline");
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                return new UploadResult(false, 0, "interrupted");
            } finally {
                inFlight.decrementAndGet();
            }
        }
    }

    public static final class StressResult {
        public final int requested;
        public final int memoryQueued;
        public final long maxTrackNanos;
        public final int uploadCount;
        public final int maxInFlight;

        StressResult(int requested, int memoryQueued, long maxTrackNanos, int uploadCount, int maxInFlight) {
            this.requested = requested;
            this.memoryQueued = memoryQueued;
            this.maxTrackNanos = maxTrackNanos;
            this.uploadCount = uploadCount;
            this.maxInFlight = maxInFlight;
        }
    }
}
