package dev.signallake;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public final class EventEnvelope {
    public static final String SCHEMA_VERSION = "signallake.event-envelope.v1";

    public final String schemaVersion;
    public final String catalogVersion;
    public final String eventId;
    public final String occurredAt;
    public final String collectedAt;
    public final Source source;
    public final Identity identity;
    public final Session session;
    public final String name;
    public final String category;
    public final Map<String, Object> properties;
    public final String privacyClass;

    EventEnvelope(
            String catalogVersion,
            String eventId,
            String occurredAt,
            String collectedAt,
            Source source,
            Identity identity,
            Session session,
            String name,
            String category,
            Map<String, Object> properties,
            String privacyClass) {
        this.schemaVersion = SCHEMA_VERSION;
        this.catalogVersion = Require.nonEmpty(catalogVersion, "catalogVersion");
        this.eventId = Require.nonEmpty(eventId, "eventId");
        this.occurredAt = Require.nonEmpty(occurredAt, "occurredAt");
        this.collectedAt = Require.nonEmpty(collectedAt, "collectedAt");
        this.source = Require.notNull(source, "source");
        this.identity = Require.notNull(identity, "identity");
        this.session = Require.notNull(session, "session");
        this.name = Require.nonEmpty(name, "event.name");
        this.category = Require.nonEmpty(category, "event.category");
        this.properties = Collections.unmodifiableMap(new LinkedHashMap<String, Object>(properties));
        this.privacyClass = Require.nonEmpty(privacyClass, "privacy.privacyClass");
    }
}
