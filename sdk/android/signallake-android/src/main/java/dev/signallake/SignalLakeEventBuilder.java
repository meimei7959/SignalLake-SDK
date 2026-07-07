package dev.signallake;

import java.util.LinkedHashMap;
import java.util.Map;

public final class SignalLakeEventBuilder {
    private final Source source;
    private final Identity identity;
    private final String sessionId;
    private final String sessionStartedAt;
    private final SignalLakeEventCatalog eventCatalog;
    private long sequence = 0;

    public SignalLakeEventBuilder(
            Source source,
            Identity identity,
            String sessionId,
            String sessionStartedAt,
            SignalLakeEventCatalog eventCatalog) {
        this.source = Require.notNull(source, "source");
        this.identity = Require.notNull(identity, "identity");
        this.sessionId = Require.nonEmpty(sessionId, "sessionId");
        this.sessionStartedAt = Require.nonEmpty(sessionStartedAt, "sessionStartedAt");
        this.eventCatalog = Require.notNull(eventCatalog, "eventCatalog");
        this.eventCatalog.validateSource(source);
    }

    public synchronized EventEnvelope buildEvent(
            String eventId,
            String now,
            String name,
            String category,
            Map<String, Object> properties) {
        Map<String, Object> safeProperties = properties == null
                ? new LinkedHashMap<String, Object>()
                : new LinkedHashMap<String, Object>(properties);
        PrivacyGuard.assertSafe(safeProperties);
        CommonPropertyValidator.assertValid(safeProperties);
        String privacyClass = eventCatalog.validateEvent(name, category, safeProperties);
        sequence += 1;
        return new EventEnvelope(
                eventCatalog.catalogVersion,
                eventId,
                now,
                now,
                source,
                identity,
                new Session(sessionId, sessionStartedAt, sequence),
                name,
                category,
                safeProperties,
                privacyClass);
    }
}
