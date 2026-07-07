package dev.signallake;

public interface SignalLakeKeyProvider {
    SignalLakeEncryptionKey getEncryptionKey() throws Exception;
}
