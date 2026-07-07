package dev.signallake;

public final class FlushResult {
    public enum Status {
        NOOP,
        EMPTY,
        ACCEPTED,
        RETAINED_FOR_RETRY,
        FAILED_NO_UPLOADER
    }

    public final Status status;
    public final String batchId;
    public final int statusCode;
    public final String message;

    private FlushResult(Status status, String batchId, int statusCode, String message) {
        this.status = status;
        this.batchId = batchId;
        this.statusCode = statusCode;
        this.message = message;
    }

    public static FlushResult noop() {
        return new FlushResult(Status.NOOP, null, 0, "no-op client");
    }

    public static FlushResult empty() {
        return new FlushResult(Status.EMPTY, null, 0, "queue empty");
    }

    public static FlushResult accepted(String batchId, int statusCode, String message) {
        return new FlushResult(Status.ACCEPTED, batchId, statusCode, message);
    }

    public static FlushResult retainedForRetry(String batchId, int statusCode, String message) {
        return new FlushResult(Status.RETAINED_FOR_RETRY, batchId, statusCode, message);
    }

    public static FlushResult failedNoUploader(String batchId) {
        return new FlushResult(Status.FAILED_NO_UPLOADER, batchId, 0, "no uploader configured");
    }
}
