package dev.signallake;

import java.util.List;

final class BatchBuilder {
    private BatchBuilder() {}

    static EventBatch buildBatch(String batchId, String createdAt, Source source, List<EventEnvelope> events) {
        return new EventBatch(batchId, createdAt, source, events);
    }

    static EncryptedEventBatch buildEncryptedBatchEnvelope(
            EventBatch batch,
            String keyId,
            String nonce,
            String ciphertext,
            String authTag) {
        return new EncryptedEventBatch(
                batch.batchId,
                batch.createdAt,
                new UploadSource(
                        batch.source.appId,
                        batch.source.product,
                        batch.source.sdkName,
                        batch.source.sdkVersion,
                        batch.source.environment),
                new PlaintextDescriptor(EventBatch.SCHEMA_VERSION, EventBatch.CONTENT_TYPE),
                new EncryptionMetadata(EncryptedEventBatch.ALG_AES_256_GCM, keyId, nonce),
                new EncryptedPayload("base64url", ciphertext, authTag));
    }
}
