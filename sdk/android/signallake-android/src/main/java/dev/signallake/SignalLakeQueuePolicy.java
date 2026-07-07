package dev.signallake;

public final class SignalLakeQueuePolicy {
    public enum DropPolicy {
        DROP_OLDEST,
        DROP_NEWEST
    }

    public final int maxEvents;
    public final int flushBatchSize;
    public final DropPolicy dropPolicy;

    public SignalLakeQueuePolicy(int maxEvents, int flushBatchSize, DropPolicy dropPolicy) {
        if (maxEvents < 1) throw new IllegalArgumentException("maxEvents must be positive");
        if (flushBatchSize < 1) throw new IllegalArgumentException("flushBatchSize must be positive");
        this.maxEvents = maxEvents;
        this.flushBatchSize = flushBatchSize;
        this.dropPolicy = dropPolicy == null ? DropPolicy.DROP_OLDEST : dropPolicy;
    }

    public static SignalLakeQueuePolicy androidTvDefault() {
        return new SignalLakeQueuePolicy(100, 20, DropPolicy.DROP_OLDEST);
    }
}
