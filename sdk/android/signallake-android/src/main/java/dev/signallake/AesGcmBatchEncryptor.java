package dev.signallake;

import java.nio.charset.Charset;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public final class AesGcmBatchEncryptor {
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BYTES = 16;
    private static final int TAG_BITS = 128;
    private static final Charset UTF_8 = Charset.forName("UTF-8");

    private final SecureRandom secureRandom;

    public AesGcmBatchEncryptor() {
        this(new SecureRandom());
    }

    AesGcmBatchEncryptor(SecureRandom secureRandom) {
        this.secureRandom = Require.notNull(secureRandom, "secureRandom");
    }

    public EncryptedEventBatch encrypt(EventBatch batch, SignalLakeEncryptionKey encryptionKey) {
        Require.notNull(batch, "batch");
        Require.notNull(encryptionKey, "encryptionKey");
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            secureRandom.nextBytes(nonce);
            String nonceText = Base64Url.encode(nonce);
            EncryptedEventBatch header = BatchBuilder.buildEncryptedBatchEnvelope(
                    batch,
                    encryptionKey.keyId,
                    nonceText,
                    "placeholder",
                    "placeholder");
            byte[] aad = JsonCodec.encryptedBatchAad(header).getBytes(UTF_8);
            byte[] plaintext = JsonCodec.eventBatchToJson(batch).getBytes(UTF_8);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            SecretKeySpec keySpec = new SecretKeySpec(encryptionKey.copyKeyBytes(), "AES");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(aad);
            byte[] sealed = cipher.doFinal(plaintext);
            int ciphertextLength = sealed.length - TAG_BYTES;
            byte[] ciphertext = Arrays.copyOfRange(sealed, 0, ciphertextLength);
            byte[] authTag = Arrays.copyOfRange(sealed, ciphertextLength, sealed.length);
            return BatchBuilder.buildEncryptedBatchEnvelope(
                    batch,
                    encryptionKey.keyId,
                    nonceText,
                    Base64Url.encode(ciphertext),
                    Base64Url.encode(authTag));
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("failed to encrypt SignalLake batch", error);
        }
    }
}
