package dev.signallake;

public final class PlaintextDescriptor {
    public final String schemaVersion;
    public final String contentType;

    public PlaintextDescriptor(String schemaVersion, String contentType) {
        this.schemaVersion = Require.nonEmpty(schemaVersion, "plaintext.schemaVersion");
        this.contentType = Require.nonEmpty(contentType, "plaintext.contentType");
    }
}
