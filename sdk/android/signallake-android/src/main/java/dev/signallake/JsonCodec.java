package dev.signallake;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.Map;

final class JsonCodec {
    private JsonCodec() {}

    static String eventBatchToJson(EventBatch batch) {
        try {
            return eventBatchObject(batch).toString();
        } catch (JSONException error) {
            throw new IllegalStateException("failed to encode event batch", error);
        }
    }

    static String encryptedBatchToJson(EncryptedEventBatch batch) {
        try {
            return encryptedBatchObject(batch).toString();
        } catch (JSONException error) {
            throw new IllegalStateException("failed to encode encrypted event batch", error);
        }
    }

    static EncryptedEventBatch encryptedBatchFromJson(String json) {
        try {
            JSONObject root = new JSONObject(json);
            JSONObject payload = root.getJSONObject("payload");
            return new EncryptedEventBatch(
                    root.getString("batchId"),
                    root.getString("createdAt"),
                    uploadSourceFromObject(root.getJSONObject("source")),
                    plaintextFromObject(root.getJSONObject("plaintext")),
                    encryptionFromObject(root.getJSONObject("encryption")),
                    new EncryptedPayload(
                            payload.getString("encoding"),
                            payload.getString("ciphertext"),
                            payload.getString("authTag")));
        } catch (JSONException error) {
            throw new IllegalStateException("failed to decode encrypted event batch", error);
        }
    }

    static String encryptedBatchAad(EncryptedEventBatch batch) {
        try {
            JSONObject root = new JSONObject();
            root.put("schemaVersion", batch.schemaVersion);
            root.put("batchId", batch.batchId);
            root.put("createdAt", batch.createdAt);
            root.put("source", uploadSourceObject(batch.source));
            root.put("plaintext", plaintextObject(batch.plaintext));
            root.put("encryption", encryptionObject(batch.encryption));
            return root.toString();
        } catch (JSONException error) {
            throw new IllegalStateException("failed to encode encrypted batch aad", error);
        }
    }

    private static JSONObject eventBatchObject(EventBatch batch) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("schemaVersion", batch.schemaVersion);
        root.put("batchId", batch.batchId);
        root.put("createdAt", batch.createdAt);
        root.put("source", uploadSourceObject(toUploadSource(batch.source)));
        root.put("eventCount", batch.eventCount);
        root.put("compression", batch.compression);
        JSONArray events = new JSONArray();
        for (EventEnvelope event : batch.events) {
            events.put(eventObject(event));
        }
        root.put("events", events);
        return root;
    }

    private static JSONObject eventObject(EventEnvelope event) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("schemaVersion", event.schemaVersion);
        root.put("catalogVersion", event.catalogVersion);
        root.put("eventId", event.eventId);
        root.put("occurredAt", event.occurredAt);
        root.put("collectedAt", event.collectedAt);
        root.put("source", fullSourceObject(event.source));
        root.put("identity", identityObject(event.identity));
        root.put("session", sessionObject(event.session));
        JSONObject eventBody = new JSONObject();
        eventBody.put("name", event.name);
        eventBody.put("category", event.category);
        eventBody.put("properties", propertiesObject(event.properties));
        root.put("event", eventBody);
        JSONObject privacy = new JSONObject();
        privacy.put("privacyClass", event.privacyClass);
        JSONObject consent = new JSONObject();
        consent.put("analytics", true);
        consent.put("diagnostics", true);
        privacy.put("consent", consent);
        privacy.put("redactedFields", new JSONArray());
        root.put("privacy", privacy);
        return root;
    }

    private static JSONObject encryptedBatchObject(EncryptedEventBatch batch) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("schemaVersion", batch.schemaVersion);
        root.put("batchId", batch.batchId);
        root.put("createdAt", batch.createdAt);
        root.put("source", uploadSourceObject(batch.source));
        root.put("plaintext", plaintextObject(batch.plaintext));
        root.put("encryption", encryptionObject(batch.encryption));
        JSONObject payload = new JSONObject();
        payload.put("encoding", batch.payload.encoding);
        payload.put("ciphertext", batch.payload.ciphertext);
        payload.put("authTag", batch.payload.authTag);
        root.put("payload", payload);
        return root;
    }

    private static JSONObject fullSourceObject(Source source) throws JSONException {
        JSONObject root = uploadSourceObject(toUploadSource(source));
        root.put("platform", source.platform);
        if (source.appVersion != null) root.put("appVersion", source.appVersion);
        return root;
    }

    private static UploadSource toUploadSource(Source source) {
        return new UploadSource(
                source.appId,
                source.product,
                source.sdkName,
                source.sdkVersion,
                source.environment);
    }

    private static JSONObject uploadSourceObject(UploadSource source) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("appId", source.appId);
        root.put("product", source.product);
        root.put("sdkName", source.sdkName);
        root.put("sdkVersion", source.sdkVersion);
        root.put("environment", source.environment);
        return root;
    }

    private static UploadSource uploadSourceFromObject(JSONObject source) throws JSONException {
        return new UploadSource(
                source.getString("appId"),
                source.getString("product"),
                source.getString("sdkName"),
                source.getString("sdkVersion"),
                source.getString("environment"));
    }

    private static JSONObject identityObject(Identity identity) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("anonymousId", identity.anonymousId);
        root.put("deviceId", identity.deviceId);
        if (identity.userId != null) root.put("userId", identity.userId);
        return root;
    }

    private static JSONObject sessionObject(Session session) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("sessionId", session.sessionId);
        root.put("startedAt", session.startedAt);
        root.put("sequence", session.sequence);
        return root;
    }

    private static JSONObject plaintextObject(PlaintextDescriptor plaintext) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("schemaVersion", plaintext.schemaVersion);
        root.put("contentType", plaintext.contentType);
        return root;
    }

    private static PlaintextDescriptor plaintextFromObject(JSONObject plaintext) throws JSONException {
        return new PlaintextDescriptor(
                plaintext.getString("schemaVersion"),
                plaintext.getString("contentType"));
    }

    private static JSONObject encryptionObject(EncryptionMetadata encryption) throws JSONException {
        JSONObject root = new JSONObject();
        root.put("alg", encryption.alg);
        root.put("keyId", encryption.keyId);
        root.put("nonce", encryption.nonce);
        return root;
    }

    private static EncryptionMetadata encryptionFromObject(JSONObject encryption) throws JSONException {
        return new EncryptionMetadata(
                encryption.getString("alg"),
                encryption.getString("keyId"),
                encryption.getString("nonce"));
    }

    private static JSONObject propertiesObject(Map<String, Object> properties) throws JSONException {
        JSONObject root = new JSONObject();
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            Object value = entry.getValue();
            root.put(entry.getKey(), value == null ? JSONObject.NULL : value);
        }
        return root;
    }
}
