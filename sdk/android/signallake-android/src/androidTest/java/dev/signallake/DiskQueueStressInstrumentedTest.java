package dev.signallake;

import junit.framework.TestCase;

import java.io.File;
import java.io.RandomAccessFile;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public final class DiskQueueStressInstrumentedTest extends TestCase {
    private static final Charset UTF_8 = Charset.forName("UTF-8");
    private static final int EVENT_COUNT = 180;
    private static final int FLUSH_BATCH_SIZE = 10;
    private static final int MAX_DISK_BATCHES = 6;
    private static final long MAX_DISK_BYTES = 256L * 1024L;

    public void testDiskQueueStressDoesNotBlockAndRecoversOnDevice() throws Exception {
        File queueDirectory = new File(tempRoot(), "signallake-device-stress-" + System.nanoTime());
        deleteRecursively(queueDirectory);

        SwitchingUploader offlineUploader = new SwitchingUploader(false);
        SignalLakeConfig offlineConfig = config(queueDirectory, offlineUploader);
        RealSignalLakeClient offlineClient = new RealSignalLakeClient(offlineConfig);

        long totalTrackNanos = 0L;
        long maxTrackNanos = 0L;
        try {
            for (int index = 0; index < EVENT_COUNT; index++) {
                Map<String, Object> properties = commandProperties(index);
                long startedAt = System.nanoTime();
                offlineClient.trackCommandInvoked("player.start", properties);
                long elapsed = System.nanoTime() - startedAt;
                totalTrackNanos += elapsed;
                maxTrackNanos = Math.max(maxTrackNanos, elapsed);

                if ((index + 1) % FLUSH_BATCH_SIZE == 0) {
                    offlineClient.flush().get(30, TimeUnit.SECONDS);
                }
            }

            assertEquals(0, offlineUploader.acceptedCount);
            assertTrue(offlineConfig.diskQueue.count() > 0);
            assertTrue(offlineConfig.diskQueue.count() <= MAX_DISK_BATCHES);
            assertTrue(offlineConfig.diskQueue.sizeBytes() <= MAX_DISK_BYTES);
            assertFalse(directoryContains(queueDirectory, "command.invoked"));
            assertFalse(directoryContains(queueDirectory, "player.start"));

            double averageTrackMs = (totalTrackNanos / 1000000.0d) / EVENT_COUNT;
            double maxTrackMs = maxTrackNanos / 1000000.0d;
            assertTrue("average track latency ms=" + averageTrackMs, averageTrackMs < 5.0d);
            assertTrue("max track latency ms=" + maxTrackMs, maxTrackMs < 100.0d);
        } finally {
            offlineClient.close();
        }

        SwitchingUploader onlineUploader = new SwitchingUploader(true);
        SignalLakeConfig onlineConfig = config(queueDirectory, onlineUploader);
        RealSignalLakeClient onlineClient = new RealSignalLakeClient(onlineConfig);
        try {
            int guard = 0;
            while (onlineConfig.diskQueue.count() > 0 && guard++ < 20) {
                FlushResult result = onlineClient.flush().get(30, TimeUnit.SECONDS);
                assertEquals(FlushResult.Status.ACCEPTED, result.status);
            }

            assertEquals(0, onlineConfig.diskQueue.count());
            assertTrue(onlineUploader.acceptedCount > 0);
        } finally {
            onlineClient.close();
            deleteRecursively(queueDirectory);
        }
    }

    private static SignalLakeConfig config(File queueDirectory, EncryptedBatchUploader uploader) {
        return new SignalLakeConfig.Builder()
                .source(source())
                .identity(new Identity("anon_device_stress", "device_device_stress"))
                .session("session_device_stress", "2026-07-08T00:00:00.000Z")
                .eventCatalog(catalog())
                .encryptionKey(encryptionKey())
                .queuePolicy(new SignalLakeQueuePolicy(80, FLUSH_BATCH_SIZE, SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST))
                .diskQueue(queueDirectory, storagePolicy())
                .uploader(uploader)
                .build();
    }

    private static SignalLakeStoragePolicy storagePolicy() {
        return new SignalLakeStoragePolicy(
                MAX_DISK_BYTES,
                MAX_DISK_BATCHES,
                SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST);
    }

    private static Map<String, Object> commandProperties(int index) {
        Map<String, Object> properties = new LinkedHashMap<String, Object>();
        properties.put(SignalLakeCommonFields.OUTCOME, SignalLakeCommonValues.Outcome.SUCCESS);
        properties.put(SignalLakeCommonFields.PROTOCOL, SignalLakeCommonValues.Protocol.DLNA);
        return properties;
    }

    private static Source source() {
        return new Source(
                "com.zknowai.labi.cast.receiver",
                "Cast-SDK",
                "signallake-android",
                "0.1.0-test",
                "android-tv",
                "0.1.0",
                "device-stress");
    }

    private static SignalLakeEncryptionKey encryptionKey() {
        byte[] key = new byte[32];
        for (int index = 0; index < key.length; index++) key[index] = (byte) (index + 1);
        return new SignalLakeEncryptionKey("device-stress-key", key);
    }

    private static SignalLakeEventCatalog catalog() {
        List<SignalLakePropertyDefinition> properties = new ArrayList<SignalLakePropertyDefinition>();
        properties.add(new SignalLakePropertyDefinition(
                SignalLakeCommonFields.COMMAND_ID,
                SignalLakePropertyDefinition.TYPE_STRING,
                SignalLakePropertyDefinition.SCOPE_COMMON,
                true,
                Arrays.asList("player.start")));
        properties.add(new SignalLakePropertyDefinition(
                SignalLakeCommonFields.OUTCOME,
                SignalLakePropertyDefinition.TYPE_STRING,
                SignalLakePropertyDefinition.SCOPE_COMMON,
                false,
                Arrays.asList(SignalLakeCommonValues.Outcome.SUCCESS)));
        properties.add(new SignalLakePropertyDefinition(
                SignalLakeCommonFields.PROTOCOL,
                SignalLakePropertyDefinition.TYPE_STRING,
                SignalLakePropertyDefinition.SCOPE_COMMON,
                false,
                Arrays.asList(SignalLakeCommonValues.Protocol.DLNA)));
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
                        properties)));
    }

    private static boolean directoryContains(File directory, String value) throws Exception {
        File[] files = directory.listFiles();
        if (files == null) return false;
        for (int index = 0; index < files.length; index++) {
            File file = files[index];
            if (file.isDirectory()) {
                if (directoryContains(file, value)) return true;
            } else if (readUtf8(file).contains(value)) {
                return true;
            }
        }
        return false;
    }

    private static File tempRoot() throws Exception {
        File probe = File.createTempFile("signallake-device-stress", ".tmp");
        File root = probe.getParentFile();
        probe.delete();
        return root;
    }

    private static String readUtf8(File file) throws Exception {
        byte[] bytes = new byte[(int) file.length()];
        RandomAccessFile input = new RandomAccessFile(file, "r");
        try {
            input.readFully(bytes);
        } finally {
            input.close();
        }
        return new String(bytes, UTF_8);
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (int index = 0; index < children.length; index++) {
                    deleteRecursively(children[index]);
                }
            }
        }
        file.delete();
    }

    private static final class SwitchingUploader implements EncryptedBatchUploader {
        private final boolean online;
        private int acceptedCount = 0;

        SwitchingUploader(boolean online) {
            this.online = online;
        }

        @Override
        public UploadResult upload(EncryptedEventBatch batch) {
            if (!online) return new UploadResult(false, 503, "offline");
            acceptedCount++;
            return new UploadResult(true, 200, "ok");
        }
    }
}
