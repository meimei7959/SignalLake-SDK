package dev.signallake;

public interface EncryptedBatchUploader {
    UploadResult upload(EncryptedEventBatch batch);
}
