package dev.signallake;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;

final class DiskEncryptedBatchQueue {
    private static final Charset UTF_8 = Charset.forName("UTF-8");
    private static final String BATCH_SUFFIX = ".batch";
    private static final String TEMP_SUFFIX = ".tmp";

    private final File directory;
    private final SignalLakeStoragePolicy policy;

    DiskEncryptedBatchQueue(File directory, SignalLakeStoragePolicy policy) {
        this.directory = Require.notNull(directory, "queueDirectory");
        this.policy = policy == null ? SignalLakeStoragePolicy.androidTvDefault() : policy;
    }

    synchronized PendingBatch enqueue(EncryptedEventBatch batch) {
        String json = JsonCodec.encryptedBatchToJson(batch);
        byte[] bytes = json.getBytes(UTF_8);
        if (bytes.length > policy.maxDiskBytes) return null;
        try {
            ensureDirectory();
            if (!makeRoom(bytes.length)) return null;
            File target = new File(directory, fileName(batch.batchId));
            File temp = new File(directory, target.getName() + TEMP_SUFFIX);
            writeBytes(temp, bytes);
            if (!temp.renameTo(target)) {
                temp.delete();
                return null;
            }
            enforceBatchLimit();
            return new PendingBatch(target, batch);
        } catch (Throwable ignored) {
            return null;
        }
    }

    synchronized PendingBatch peek() {
        File[] files = batchFiles();
        for (int index = 0; index < files.length; index++) {
            File file = files[index];
            try {
                EncryptedEventBatch batch = JsonCodec.encryptedBatchFromJson(readUtf8(file));
                return new PendingBatch(file, batch);
            } catch (Throwable ignored) {
                file.delete();
            }
        }
        return null;
    }

    synchronized void delete(PendingBatch batch) {
        if (batch != null) batch.file.delete();
    }

    synchronized int count() {
        return batchFiles().length;
    }

    synchronized long sizeBytes() {
        File[] files = batchFiles();
        long total = 0;
        for (int index = 0; index < files.length; index++) {
            total += files[index].length();
        }
        return total;
    }

    File directory() {
        return directory;
    }

    private void ensureDirectory() throws IOException {
        if (directory.isDirectory()) return;
        if (!directory.mkdirs() && !directory.isDirectory()) {
            throw new IOException("failed to create SignalLake queue directory");
        }
    }

    private boolean makeRoom(long incomingBytes) {
        if (policy.dropPolicy == SignalLakeQueuePolicy.DropPolicy.DROP_NEWEST) {
            return count() < policy.maxDiskBatches && sizeBytes() + incomingBytes <= policy.maxDiskBytes;
        }
        while (count() >= policy.maxDiskBatches || sizeBytes() + incomingBytes > policy.maxDiskBytes) {
            File oldest = oldestBatchFile();
            if (oldest == null || !oldest.delete()) return false;
        }
        return true;
    }

    private void enforceBatchLimit() {
        while (count() > policy.maxDiskBatches) {
            File oldest = oldestBatchFile();
            if (oldest == null || !oldest.delete()) return;
        }
    }

    private File oldestBatchFile() {
        File[] files = batchFiles();
        return files.length == 0 ? null : files[0];
    }

    private File[] batchFiles() {
        File[] files = directory.listFiles();
        if (files == null) return new File[0];
        int count = 0;
        for (int index = 0; index < files.length; index++) {
            if (isBatchFile(files[index])) count++;
        }
        File[] batches = new File[count];
        int out = 0;
        for (int index = 0; index < files.length; index++) {
            if (isBatchFile(files[index])) batches[out++] = files[index];
        }
        Arrays.sort(batches, new Comparator<File>() {
            @Override
            public int compare(File left, File right) {
                return left.getName().compareTo(right.getName());
            }
        });
        return batches;
    }

    private static boolean isBatchFile(File file) {
        return file.isFile() && file.getName().endsWith(BATCH_SUFFIX);
    }

    private static String fileName(String batchId) {
        return String.format(
                Locale.US,
                "%013d-%s%s",
                System.currentTimeMillis(),
                sanitize(batchId),
                BATCH_SUFFIX);
    }

    private static String sanitize(String value) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < value.length(); index++) {
            char ch = value.charAt(index);
            if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_') {
                builder.append(ch);
            } else {
                builder.append('_');
            }
        }
        return builder.toString();
    }

    private static void writeBytes(File file, byte[] bytes) throws IOException {
        RandomAccessFile output = new RandomAccessFile(file, "rw");
        try {
            output.setLength(0);
            output.write(bytes);
            output.getFD().sync();
        } finally {
            output.close();
        }
    }

    private static String readUtf8(File file) throws IOException {
        long length = file.length();
        if (length > Integer.MAX_VALUE) throw new IOException("SignalLake batch file too large");
        byte[] bytes = new byte[(int) length];
        RandomAccessFile input = new RandomAccessFile(file, "r");
        try {
            input.readFully(bytes);
        } finally {
            input.close();
        }
        return new String(bytes, UTF_8);
    }

    static final class PendingBatch {
        final File file;
        final EncryptedEventBatch batch;

        PendingBatch(File file, EncryptedEventBatch batch) {
            this.file = file;
            this.batch = batch;
        }
    }
}
