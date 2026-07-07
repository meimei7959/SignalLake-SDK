package dev.signallake;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SignalLakeEventCatalog {
    public final String schemaVersion;
    public final String catalogVersion;
    public final String product;
    public final String appId;
    public final String status;
    public final List<SignalLakeEventDefinition> events;
    private final Map<String, SignalLakeEventDefinition> eventsByName;

    public SignalLakeEventCatalog(
            String catalogVersion,
            String product,
            String appId,
            String status,
            List<SignalLakeEventDefinition> events) {
        this.schemaVersion = "signallake.event-catalog.v1";
        this.catalogVersion = Require.nonEmpty(catalogVersion, "catalog.catalogVersion");
        this.product = Require.nonEmpty(product, "catalog.product");
        this.appId = Require.nonEmpty(appId, "catalog.appId");
        this.status = Require.nonEmpty(status, "catalog.status");
        this.events = events == null
                ? Collections.<SignalLakeEventDefinition>emptyList()
                : Collections.unmodifiableList(new ArrayList<SignalLakeEventDefinition>(events));
        if (this.events.isEmpty()) {
            throw new IllegalArgumentException("catalog.events must be non-empty");
        }
        LinkedHashMap<String, SignalLakeEventDefinition> byName =
                new LinkedHashMap<String, SignalLakeEventDefinition>();
        for (SignalLakeEventDefinition event : this.events) {
            if (byName.containsKey(event.name)) {
                throw new IllegalArgumentException(event.name + " is duplicated");
            }
            byName.put(event.name, event);
        }
        this.eventsByName = Collections.unmodifiableMap(byName);
    }

    public void validateSource(Source source) {
        Require.notNull(source, "source");
        if (!product.equals(source.product)) {
            throw new SignalLakeCatalogException("catalog.product does not match source.product");
        }
        if (!appId.equals(source.appId)) {
            throw new SignalLakeCatalogException("catalog.appId does not match source.appId");
        }
    }

    public String validateEvent(
            String name,
            String category,
            Map<String, Object> properties) {
        SignalLakeEventDefinition event = eventsByName.get(Require.nonEmpty(name, "event.name"));
        if (event == null) {
            throw new SignalLakeCatalogException("event " + name + " is not registered in " + catalogVersion);
        }
        if (SignalLakeEventDefinition.STATUS_PLANNED.equals(event.status)
                || SignalLakeEventDefinition.STATUS_REMOVED.equals(event.status)) {
            throw new SignalLakeCatalogException("event " + name + " is not active");
        }
        if (!event.category.equals(Require.nonEmpty(category, "event.category"))) {
            throw new SignalLakeCatalogException("event " + name + " category must be " + event.category);
        }
        Map<String, Object> safeProperties = properties == null
                ? Collections.<String, Object>emptyMap()
                : properties;
        for (SignalLakePropertyDefinition definition : event.properties) {
            if (definition.required && (!safeProperties.containsKey(definition.name)
                    || safeProperties.get(definition.name) == null)) {
                throw new SignalLakeCatalogException(
                        "event " + name + " missing required property " + definition.name);
            }
        }
        for (Map.Entry<String, Object> entry : safeProperties.entrySet()) {
            SignalLakePropertyDefinition definition = event.property(entry.getKey());
            if (definition == null) {
                throw new SignalLakeCatalogException(
                        "event " + name + " property " + entry.getKey() + " is not declared in catalog");
            }
            validateProperty(name, definition, entry.getValue());
        }
        return event.privacyClass;
    }

    private static void validateProperty(String eventName, SignalLakePropertyDefinition definition, Object value) {
        if (value == null) return;
        if (SignalLakePropertyDefinition.TYPE_STRING.equals(definition.type) && !(value instanceof String)) {
            throw new SignalLakeCatalogException(eventName + "." + definition.name + " must be a string");
        }
        if (SignalLakePropertyDefinition.TYPE_NUMBER.equals(definition.type) && !(value instanceof Number)) {
            throw new SignalLakeCatalogException(eventName + "." + definition.name + " must be a number");
        }
        if (SignalLakePropertyDefinition.TYPE_INTEGER.equals(definition.type)
                && !(value instanceof Integer) && !(value instanceof Long)) {
            throw new SignalLakeCatalogException(eventName + "." + definition.name + " must be an integer");
        }
        if (SignalLakePropertyDefinition.TYPE_BOOLEAN.equals(definition.type) && !(value instanceof Boolean)) {
            throw new SignalLakeCatalogException(eventName + "." + definition.name + " must be a boolean");
        }
        if (!definition.enumValues.isEmpty() && value instanceof String
                && !definition.enumValues.contains(value)) {
            throw new SignalLakeCatalogException(
                    eventName + "." + definition.name + " has unsupported enum value");
        }
    }
}
