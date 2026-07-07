package dev.signallake;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class EventBatch {
    public static final String SCHEMA_VERSION = "signallake.event-batch.v1";
    public static final String CONTENT_TYPE = "application/vnd.signallake.event-batch+json;v=1";

    public final String schemaVersion;
    public final String batchId;
    public final String createdAt;
    public final Source source;
    public final int eventCount;
    public final String compression;
    public final List<EventEnvelope> events;

    EventBatch(String batchId, String createdAt, Source source, List<EventEnvelope> events) {
        this.schemaVersion = SCHEMA_VERSION;
        this.batchId = Require.nonEmpty(batchId, "batchId");
        this.createdAt = Require.nonEmpty(createdAt, "createdAt");
        this.source = Require.notNull(source, "source");
        if (events == null || events.isEmpty()) {
            throw new IllegalArgumentException("events must be non-empty");
        }
        this.events = Collections.unmodifiableList(new ArrayList<EventEnvelope>(events));
        this.eventCount = events.size();
        this.compression = "none";
    }
}
