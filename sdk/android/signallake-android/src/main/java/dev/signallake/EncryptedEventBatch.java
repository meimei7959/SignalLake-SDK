package dev.signallake;

public final class EncryptedEventBatch {
    public static final String SCHEMA_VERSION = "signallake.encrypted-event-batch.v1";
    public static final String ALG_AES_256_GCM = "AES-256-GCM";

    public final String schemaVersion;
    public final String batchId;
    public final String createdAt;
    public final UploadSource source;
    public final PlaintextDescriptor plaintext;
    public final EncryptionMetadata encryption;
    public final EncryptedPayload payload;

    public EncryptedEventBatch(
            String batchId,
            String createdAt,
            UploadSource source,
            PlaintextDescriptor plaintext,
            EncryptionMetadata encryption,
            EncryptedPayload payload) {
        this.schemaVersion = SCHEMA_VERSION;
        this.batchId = Require.nonEmpty(batchId, "batchId");
        this.createdAt = Require.nonEmpty(createdAt, "createdAt");
        this.source = Require.notNull(source, "source");
        this.plaintext = Require.notNull(plaintext, "plaintext");
        this.encryption = Require.notNull(encryption, "encryption");
        this.payload = Require.notNull(payload, "payload");
    }
}
