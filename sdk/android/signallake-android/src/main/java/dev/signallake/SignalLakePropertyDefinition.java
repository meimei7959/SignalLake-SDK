package dev.signallake;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class SignalLakePropertyDefinition {
    public static final String TYPE_STRING = "string";
    public static final String TYPE_NUMBER = "number";
    public static final String TYPE_INTEGER = "integer";
    public static final String TYPE_BOOLEAN = "boolean";
    public static final String SCOPE_COMMON = "common";
    public static final String SCOPE_PRODUCT = "product";

    public final String name;
    public final String type;
    public final String scope;
    public final boolean required;
    public final List<String> enumValues;

    public SignalLakePropertyDefinition(
            String name,
            String type,
            String scope,
            boolean required,
            List<String> enumValues) {
        this.name = Require.nonEmpty(name, "catalog.property.name");
        this.type = Require.nonEmpty(type, "catalog.property.type");
        this.scope = Require.nonEmpty(scope, "catalog.property.scope");
        this.required = required;
        this.enumValues = enumValues == null
                ? Collections.<String>emptyList()
                : Collections.unmodifiableList(new ArrayList<String>(enumValues));
    }
}
