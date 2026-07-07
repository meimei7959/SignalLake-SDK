package dev.signallake;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SignalLakeEventDefinition {
    public static final String STATUS_PLANNED = "planned";
    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_DEPRECATED = "deprecated";
    public static final String STATUS_REMOVED = "removed";

    public final String name;
    public final String category;
    public final String privacyClass;
    public final String status;
    public final List<SignalLakePropertyDefinition> properties;
    private final Map<String, SignalLakePropertyDefinition> propertiesByName;

    public SignalLakeEventDefinition(
            String name,
            String category,
            String privacyClass,
            String status,
            List<SignalLakePropertyDefinition> properties) {
        this.name = Require.nonEmpty(name, "catalog.event.name");
        this.category = Require.nonEmpty(category, "catalog.event.category");
        this.privacyClass = Require.nonEmpty(privacyClass, "catalog.event.privacyClass");
        this.status = Require.nonEmpty(status, "catalog.event.status");
        this.properties = properties == null
                ? Collections.<SignalLakePropertyDefinition>emptyList()
                : Collections.unmodifiableList(new ArrayList<SignalLakePropertyDefinition>(properties));
        LinkedHashMap<String, SignalLakePropertyDefinition> byName =
                new LinkedHashMap<String, SignalLakePropertyDefinition>();
        for (SignalLakePropertyDefinition property : this.properties) {
            if (byName.containsKey(property.name)) {
                throw new IllegalArgumentException(name + "." + property.name + " is duplicated");
            }
            byName.put(property.name, property);
        }
        this.propertiesByName = Collections.unmodifiableMap(byName);
    }

    SignalLakePropertyDefinition property(String name) {
        return propertiesByName.get(name);
    }
}
