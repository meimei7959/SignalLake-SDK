package dev.signallake;

public final class SignalLakeStoragePolicy {
    public static final long DEFAULT_MAX_DISK_BYTES = 1024L * 1024L;
    public static final int DEFAULT_MAX_DISK_BATCHES = 100;

    public final long maxDiskBytes;
    public final int maxDiskBatches;
    public final SignalLakeQueuePolicy.DropPolicy dropPolicy;

    public SignalLakeStoragePolicy(
            long maxDiskBytes,
            int maxDiskBatches,
            SignalLakeQueuePolicy.DropPolicy dropPolicy) {
        if (maxDiskBytes < 1) throw new IllegalArgumentException("maxDiskBytes must be positive");
        if (maxDiskBatches < 1) throw new IllegalArgumentException("maxDiskBatches must be positive");
        this.maxDiskBytes = maxDiskBytes;
        this.maxDiskBatches = maxDiskBatches;
        this.dropPolicy = dropPolicy == null
                ? SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST
                : dropPolicy;
    }

    public static SignalLakeStoragePolicy androidTvDefault() {
        return new SignalLakeStoragePolicy(
                DEFAULT_MAX_DISK_BYTES,
                DEFAULT_MAX_DISK_BATCHES,
                SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST);
    }
}
