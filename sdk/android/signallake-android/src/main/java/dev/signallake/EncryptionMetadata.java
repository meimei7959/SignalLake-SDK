package dev.signallake;

public final class EncryptionMetadata {
    public final String alg;
    public final String keyId;
    public final String nonce;

    public EncryptionMetadata(String alg, String keyId, String nonce) {
        this.alg = Require.nonEmpty(alg, "encryption.alg");
        this.keyId = Require.nonEmpty(keyId, "encryption.keyId");
        this.nonce = Require.nonEmpty(nonce, "encryption.nonce");
    }
}
