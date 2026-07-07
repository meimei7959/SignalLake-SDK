package dev.signallake;

import java.util.Arrays;

public final class SignalLakeDebugKeyProvider implements SignalLakeKeyProvider {
    private final String keyId;
    private final byte[] keyBytes;

    public SignalLakeDebugKeyProvider(String keyId, byte[] keyBytes, boolean debugBuild) {
        if (!debugBuild) {
            throw new IllegalArgumentException("SignalLakeDebugKeyProvider is debug-only");
        }
        this.keyId = Require.nonEmpty(keyId, "keyId");
        new SignalLakeEncryptionKey(keyId, keyBytes);
        this.keyBytes = Arrays.copyOf(keyBytes, keyBytes.length);
    }

    @Override
    public SignalLakeEncryptionKey getEncryptionKey() {
        return new SignalLakeEncryptionKey(keyId, keyBytes);
    }
}
