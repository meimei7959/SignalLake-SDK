package dev.signallake;

import junit.framework.TestCase;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Api19CryptoInstrumentedTest extends TestCase {
    public void testAesGcmEncryptedBatchOnDeviceRuntime() {
        Source source = new Source(
                "com.zknowai.labi.cast.receiver",
                "Cast-SDK",
                "signallake-android",
                "0.1.0-test",
                "android-tv",
                "0.1.0",
                "test");
        Identity identity = new Identity("anon_api19_test_001", "device_api19_test_001");
        SignalLakeEventBuilder builder = new SignalLakeEventBuilder(
                source,
                identity,
                "session_api19_test_001",
                "2026-07-07T00:00:00.000Z",
                api19Catalog());

        Map<String, Object> properties = new LinkedHashMap<String, Object>();
        properties.put(SignalLakeCommonFields.COMMAND_ID, "player.start");
        properties.put(SignalLakeCommonFields.OUTCOME, SignalLakeCommonValues.Outcome.SUCCESS);
        properties.put(SignalLakeCommonFields.PROTOCOL, SignalLakeCommonValues.Protocol.DLNA);

        List<EventEnvelope> events = new ArrayList<EventEnvelope>();
        events.add(builder.buildEvent(
                "11111111-1111-4111-8111-111111111111",
                "2026-07-07T00:00:01.000Z",
                "command.invoked",
                "command",
                properties));
        EventBatch batch = BatchBuilder.buildBatch(
                "22222222-2222-4222-8222-222222222222",
                "2026-07-07T00:00:02.000Z",
                source,
                events);

        byte[] key = new byte[32];
        for (int i = 0; i < key.length; i++) key[i] = (byte) (i + 1);

        EncryptedEventBatch encrypted = new AesGcmBatchEncryptor()
                .encrypt(batch, new SignalLakeEncryptionKey("api19-test-key", key));

        assertEquals("signallake.encrypted-event-batch.v1", encrypted.schemaVersion);
        assertEquals("AES-256-GCM", encrypted.encryption.alg);
        assertEquals("api19-test-key", encrypted.encryption.keyId);
        assertEquals("base64url", encrypted.payload.encoding);
        assertTrue(encrypted.payload.ciphertext.length() > 0);
        assertTrue(encrypted.payload.authTag.length() > 0);
        assertFalse(encrypted.payload.ciphertext.contains("command.invoked"));
    }

    private static SignalLakeEventCatalog api19Catalog() {
        return new SignalLakeEventCatalog(
                "signallake.catalog.cast-sdk.receiver.v1",
                "Cast-SDK",
                "com.zknowai.labi.cast.receiver",
                SignalLakeEventDefinition.STATUS_ACTIVE,
                Arrays.asList(new SignalLakeEventDefinition(
                        "command.invoked",
                        "command",
                        "behavioral",
                        SignalLakeEventDefinition.STATUS_ACTIVE,
                        Arrays.asList(
                                new SignalLakePropertyDefinition(
                                        SignalLakeCommonFields.COMMAND_ID,
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        true,
                                        Arrays.asList("player.start")),
                                new SignalLakePropertyDefinition(
                                        SignalLakeCommonFields.OUTCOME,
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList(SignalLakeCommonValues.Outcome.SUCCESS)),
                                new SignalLakePropertyDefinition(
                                        SignalLakeCommonFields.PROTOCOL,
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList(SignalLakeCommonValues.Protocol.DLNA))))));
    }
}
