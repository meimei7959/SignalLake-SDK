package dev.signallake;

import java.util.Arrays;

public final class SignalLakeEncryptionKey {
    public final String keyId;
    private final byte[] keyBytes;

    public SignalLakeEncryptionKey(String keyId, byte[] keyBytes) {
        this.keyId = Require.nonEmpty(keyId, "encryption.keyId");
        if (keyBytes == null || keyBytes.length != 32) {
            throw new IllegalArgumentException("encryption key must be 32 bytes for AES-256-GCM");
        }
        this.keyBytes = Arrays.copyOf(keyBytes, keyBytes.length);
    }

    byte[] copyKeyBytes() {
        return Arrays.copyOf(keyBytes, keyBytes.length);
    }
}
