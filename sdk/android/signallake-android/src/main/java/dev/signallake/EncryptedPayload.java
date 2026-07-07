package dev.signallake;

public final class EncryptedPayload {
    public final String encoding;
    public final String ciphertext;
    public final String authTag;

    public EncryptedPayload(String encoding, String ciphertext, String authTag) {
        this.encoding = Require.nonEmpty(encoding, "payload.encoding");
        this.ciphertext = Require.nonEmpty(ciphertext, "payload.ciphertext");
        this.authTag = Require.nonEmpty(authTag, "payload.authTag");
    }
}
