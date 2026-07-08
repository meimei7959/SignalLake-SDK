package dev.signallake;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.FutureTask;

public final class RealSignalLakeClient implements SignalLakeClient {
    private final SignalLakeConfig config;
    private final SignalLakeEventBuilder builder;
    private final RingMemoryQueue queue;
    private final AesGcmBatchEncryptor encryptor;
    private final ExecutorService executor;
    private final Object pendingLock = new Object();
    private final Object flushLock = new Object();
    private PendingUpload pendingUpload;
    private FlushTask scheduledFlush;
    private int retryCount = 0;
    private long nextRetryAtMs = 0;
    private volatile boolean closed = false;

    public RealSignalLakeClient(SignalLakeConfig config) {
        this.config = Require.notNull(config, "config");
        this.builder = new SignalLakeEventBuilder(
                config.source,
                config.identity,
                config.sessionId,
                config.sessionStartedAt,
                config.eventCatalog);
        this.queue = new RingMemoryQueue(config.queuePolicy);
        this.encryptor = new AesGcmBatchEncryptor();
        this.executor = Executors.newSingleThreadExecutor();
    }

    @Override
    public void track(String name, String category, Map<String, Object> properties) {
        if (closed) return;
        try {
            EventEnvelope event = builder.buildEvent(
                    UUID.randomUUID().toString(),
                    TimeUtil.isoNow(),
                    name,
                    category,
                    properties);
            queue.enqueue(event);
        } catch (SignalLakePrivacyException error) {
            // Drop unsafe event. Host app must not crash because analytics rejected fields.
            notifyRejected(name, error);
        } catch (RuntimeException error) {
            // Analytics must never destabilize receiver runtime.
            notifyRejected(name, error);
        }
    }

    @Override
    public void trackAppOpened(Map<String, Object> properties) {
        track("app.opened", "lifecycle", properties);
    }

    @Override
    public void trackScreenViewed(String screenId, Map<String, Object> properties) {
        Map<String, Object> merged = copyProperties(properties);
        merged.put("screenId", screenId);
        track("screen.viewed", "screen", merged);
    }

    @Override
    public void trackCommandInvoked(String commandId, Map<String, Object> properties) {
        Map<String, Object> merged = copyProperties(properties);
        merged.put("commandId", commandId);
        track("command.invoked", "command", merged);
    }

    @Override
    public void trackErrorOccurred(String errorCode, Map<String, Object> properties) {
        Map<String, Object> merged = copyProperties(properties);
        merged.put("errorCode", errorCode);
        track("error.occurred", "error", merged);
    }

    @Override
    public Future<FlushResult> flush() {
        if (closed) return new CompletedFuture<FlushResult>(FlushResult.noop());
        synchronized (flushLock) {
            if (scheduledFlush != null && !scheduledFlush.isDone()) return scheduledFlush;
            scheduledFlush = new FlushTask();
            executor.execute(scheduledFlush);
            return scheduledFlush;
        }
    }

    @Override
    public int queuedCount() {
        return queue.size();
    }

    @Override
    public void close() {
        closed = true;
        executor.shutdown();
    }

    private FlushResult flushBlocking() {
        persistQueuedBatchToDisk();
        PendingUpload upload = getOrCreatePendingUpload();
        if (upload == null) return FlushResult.empty();
        if (config.uploader == null) {
            return FlushResult.failedNoUploader(upload.batchId);
        }
        long now = System.currentTimeMillis();
        if (now < nextRetryAtMs) {
            return FlushResult.retainedForRetry(upload.batchId, 0, "retry backoff active");
        }
        try {
            UploadResult result = config.uploader.upload(upload.batch);
            if (result.ok) {
                synchronized (pendingLock) {
                    if (pendingUpload == upload && upload.diskBatch != null && config.diskQueue != null) {
                        config.diskQueue.delete(upload.diskBatch);
                    }
                    if (pendingUpload == upload) pendingUpload = null;
                    retryCount = 0;
                    nextRetryAtMs = 0;
                }
                return FlushResult.accepted(upload.batchId, result.statusCode, result.message);
            }
            rememberRetry();
            return FlushResult.retainedForRetry(upload.batchId, result.statusCode, result.message);
        } catch (Throwable error) {
            rememberRetry();
            return FlushResult.retainedForRetry(
                    upload.batchId,
                    0,
                    error.getClass().getSimpleName() + ": " + error.getMessage());
        }
    }

    private void persistQueuedBatchToDisk() {
        if (config.diskQueue == null) return;
        synchronized (pendingLock) {
            List<EventEnvelope> drained = queue.drain(config.queuePolicy.flushBatchSize);
            if (drained.isEmpty()) return;
            try {
                EventBatch batch = BatchBuilder.buildBatch(
                        UUID.randomUUID().toString(),
                        TimeUtil.isoNow(),
                        config.source,
                        drained);
                EncryptedEventBatch encrypted = encryptor.encrypt(batch, config.encryptionKey);
                DiskEncryptedBatchQueue.PendingBatch diskBatch = config.diskQueue.enqueue(encrypted);
                if (diskBatch == null) queue.restoreFront(drained);
            } catch (Throwable error) {
                queue.restoreFront(drained);
            }
        }
    }

    private PendingUpload getOrCreatePendingUpload() {
        synchronized (pendingLock) {
            if (pendingUpload != null) return pendingUpload;
            if (config.diskQueue != null) {
                DiskEncryptedBatchQueue.PendingBatch diskBatch = config.diskQueue.peek();
                if (diskBatch != null) {
                    pendingUpload = new PendingUpload(diskBatch.batch.batchId, diskBatch.batch, diskBatch);
                    return pendingUpload;
                }
            }
            List<EventEnvelope> drained = queue.drain(config.queuePolicy.flushBatchSize);
            if (drained.isEmpty()) return null;
            try {
                EventBatch batch = BatchBuilder.buildBatch(
                        UUID.randomUUID().toString(),
                        TimeUtil.isoNow(),
                        config.source,
                        drained);
                EncryptedEventBatch encrypted = encryptor.encrypt(batch, config.encryptionKey);
                DiskEncryptedBatchQueue.PendingBatch diskBatch = null;
                if (config.diskQueue != null) {
                    diskBatch = config.diskQueue.enqueue(encrypted);
                }
                pendingUpload = new PendingUpload(encrypted.batchId, encrypted, diskBatch);
                return pendingUpload;
            } catch (Throwable error) {
                queue.restoreFront(drained);
                return null;
            }
        }
    }

    private void rememberRetry() {
        synchronized (pendingLock) {
            retryCount = Math.min(retryCount + 1, 9);
            long delayMs = Math.min(300000L, 1000L << (retryCount - 1));
            nextRetryAtMs = System.currentTimeMillis() + delayMs;
        }
    }

    private static Map<String, Object> copyProperties(Map<String, Object> properties) {
        if (properties == null) return new LinkedHashMap<String, Object>();
        return new LinkedHashMap<String, Object>(properties);
    }

    private void notifyRejected(String name, RuntimeException error) {
        if (config.rejectListener == null) return;
        try {
            config.rejectListener.onRejected(name, error.getMessage());
        } catch (RuntimeException ignored) {
            // Analytics rejection observers must never destabilize host runtime.
        }
    }

    private static final class PendingUpload {
        final String batchId;
        final EncryptedEventBatch batch;
        final DiskEncryptedBatchQueue.PendingBatch diskBatch;

        PendingUpload(
                String batchId,
                EncryptedEventBatch batch,
                DiskEncryptedBatchQueue.PendingBatch diskBatch) {
            this.batchId = batchId;
            this.batch = batch;
            this.diskBatch = diskBatch;
        }
    }

    private final class FlushTask extends FutureTask<FlushResult> {
        FlushTask() {
            super(new java.util.concurrent.Callable<FlushResult>() {
                @Override
                public FlushResult call() {
                    return RealSignalLakeClient.this.flushBlocking();
                }
            });
        }

        @Override
        protected void done() {
            synchronized (flushLock) {
                if (scheduledFlush == this) scheduledFlush = null;
            }
        }
    }
}
