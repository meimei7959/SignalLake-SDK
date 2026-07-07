package dev.signallake.samples;

import android.util.Base64;

import dev.signallake.SignalLakeEncryptionKey;
import dev.signallake.SignalLakeKeyProvider;

public final class ProductionKeyProviderExample implements SignalLakeKeyProvider {
    private final KeyEndpoint endpoint;

    public ProductionKeyProviderExample(KeyEndpoint endpoint) {
        this.endpoint = endpoint;
    }

    @Override
    public SignalLakeEncryptionKey getEncryptionKey() throws Exception {
        KeyResponse response = endpoint.fetchCurrentKey();
        byte[] keyBytes = Base64.decode(response.base64Key, Base64.DEFAULT);
        return new SignalLakeEncryptionKey(response.keyId, keyBytes);
    }

    public interface KeyEndpoint {
        KeyResponse fetchCurrentKey() throws Exception;
    }

    public static final class KeyResponse {
        public final String keyId;
        public final String base64Key;

        public KeyResponse(String keyId, String base64Key) {
            this.keyId = keyId;
            this.base64Key = base64Key;
        }
    }
}
