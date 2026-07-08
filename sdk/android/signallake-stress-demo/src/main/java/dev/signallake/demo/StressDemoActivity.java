package dev.signallake.demo;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import dev.signallake.EncryptedBatchUploader;
import dev.signallake.EncryptedEventBatch;
import dev.signallake.FlushResult;
import dev.signallake.Identity;
import dev.signallake.SignalLake;
import dev.signallake.SignalLakeClient;
import dev.signallake.SignalLakeCommonFields;
import dev.signallake.SignalLakeCommonValues;
import dev.signallake.SignalLakeConfig;
import dev.signallake.SignalLakeEncryptionKey;
import dev.signallake.SignalLakeEventCatalog;
import dev.signallake.SignalLakeEventDefinition;
import dev.signallake.SignalLakeProperties;
import dev.signallake.SignalLakePropertyDefinition;
import dev.signallake.SignalLakeQueuePolicy;
import dev.signallake.SignalLakeStoragePolicy;
import dev.signallake.Source;
import dev.signallake.UploadResult;

import java.io.File;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public final class StressDemoActivity extends Activity {
    private static final Charset UTF_8 = Charset.forName("UTF-8");
    private static final int OFFLINE_EVENT_COUNT = 300;
    private static final int SLOW_EVENT_COUNT = 50;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final FakeUploader uploader = new FakeUploader();

    private File queueDirectory;
    private TextView statusView;
    private Button offlineButton;
    private Button slowButton;
    private Button recoverButton;
    private Button clearButton;
    private SignalLakeClient analytics;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        queueDirectory = new File(new File(appStorageRoot(), "signallake"), "queue-demo");
        buildUi();
        startClient(FakeUploader.Mode.SUCCESS);
        postStatus("STATUS ready diskBatches=" + diskBatchCount() + " diskBytes=" + diskBytes()
                + " uploads=" + uploader.uploadCount.get()
                + " maxInFlight=" + uploader.maxInFlight.get()
                + " plaintextLeak=" + plaintextLeak());
    }

    @Override
    protected void onDestroy() {
        if (analytics != null) analytics.close();
        worker.shutdown();
        super.onDestroy();
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 32, 32, 32);
        scroll.addView(root);

        TextView title = new TextView(this);
        title.setText("SignalLake Stress Demo");
        title.setTextSize(24);
        root.addView(title);

        offlineButton = button("Run Offline");
        slowButton = button("Run Slow");
        recoverButton = button("Recover");
        clearButton = button("Clear");
        root.addView(offlineButton);
        root.addView(slowButton);
        root.addView(recoverButton);
        root.addView(clearButton);

        statusView = new TextView(this);
        statusView.setTextSize(16);
        statusView.setGravity(Gravity.START);
        statusView.setPadding(0, 24, 0, 0);
        root.addView(statusView);

        offlineButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                runInWorker(new Runnable() {
                    @Override
                    public void run() {
                        runOfflineBurst();
                    }
                });
            }
        });
        slowButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                runInWorker(new Runnable() {
                    @Override
                    public void run() {
                        runSlowUploads();
                    }
                });
            }
        });
        recoverButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                runInWorker(new Runnable() {
                    @Override
                    public void run() {
                        recoverUploads();
                    }
                });
            }
        });
        clearButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                runInWorker(new Runnable() {
                    @Override
                    public void run() {
                        clearState();
                    }
                });
            }
        });

        setContentView(scroll);
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setContentDescription(text);
        return button;
    }

    private void runOfflineBurst() {
        startClient(FakeUploader.Mode.OFFLINE);
        long maxTrackNanos = 0;
        try {
            for (int index = 0; index < OFFLINE_EVENT_COUNT; index++) {
                long startedAt = System.nanoTime();
                analytics.trackCommandInvoked("stress.run", stressProperties());
                maxTrackNanos = Math.max(maxTrackNanos, System.nanoTime() - startedAt);
                if ((index + 1) % 10 == 0) analytics.flush().get(30, TimeUnit.SECONDS);
            }
            analytics.flush().get(30, TimeUnit.SECONDS);
            postStatus("STATUS offline_done requested=" + OFFLINE_EVENT_COUNT
                    + " memoryQueued=" + analytics.queuedCount()
                    + " diskBatches=" + diskBatchCount()
                    + " diskBytes=" + diskBytes()
                    + " uploads=" + uploader.uploadCount.get()
                    + " maxInFlight=" + uploader.maxInFlight.get()
                    + " maxTrackMs=" + nanosToMs(maxTrackNanos)
                    + " plaintextLeak=" + plaintextLeak());
        } catch (Throwable error) {
            postStatus("STATUS offline_failed error=" + error.getClass().getSimpleName()
                    + " message=" + sanitize(error.getMessage()));
        }
    }

    private void runSlowUploads() {
        startClient(FakeUploader.Mode.SLOW_SUCCESS);
        try {
            for (int index = 0; index < SLOW_EVENT_COUNT; index++) {
                analytics.trackCommandInvoked("stress.slow", stressProperties());
            }
            int flushes = 0;
            while (analytics.queuedCount() > 0 && flushes < 20) {
                analytics.flush().get(30, TimeUnit.SECONDS);
                flushes++;
            }
            postStatus("STATUS slow_done requested=" + SLOW_EVENT_COUNT
                    + " flushes=" + flushes
                    + " memoryQueued=" + analytics.queuedCount()
                    + " diskBatches=" + diskBatchCount()
                    + " diskBytes=" + diskBytes()
                    + " uploads=" + uploader.uploadCount.get()
                    + " maxInFlight=" + uploader.maxInFlight.get()
                    + " plaintextLeak=" + plaintextLeak());
        } catch (Throwable error) {
            postStatus("STATUS slow_failed error=" + error.getClass().getSimpleName()
                    + " message=" + sanitize(error.getMessage()));
        }
    }

    private void recoverUploads() {
        startClient(FakeUploader.Mode.SUCCESS);
        try {
            int flushes = 0;
            while (diskBatchCount() > 0 && flushes < 80) {
                FlushResult result = analytics.flush().get(30, TimeUnit.SECONDS);
                flushes++;
                if (result.status == FlushResult.Status.EMPTY) break;
            }
            postStatus("STATUS recover_done flushes=" + flushes
                    + " memoryQueued=" + analytics.queuedCount()
                    + " diskBatches=" + diskBatchCount()
                    + " diskBytes=" + diskBytes()
                    + " uploads=" + uploader.uploadCount.get()
                    + " maxInFlight=" + uploader.maxInFlight.get()
                    + " plaintextLeak=" + plaintextLeak());
        } catch (Throwable error) {
            postStatus("STATUS recover_failed error=" + error.getClass().getSimpleName()
                    + " message=" + sanitize(error.getMessage()));
        }
    }

    private void clearState() {
        if (analytics != null) analytics.close();
        analytics = null;
        deleteRecursively(queueDirectory);
        uploader.reset();
        startClient(FakeUploader.Mode.SUCCESS);
        postStatus("STATUS cleared diskBatches=" + diskBatchCount()
                + " diskBytes=" + diskBytes()
                + " uploads=" + uploader.uploadCount.get()
                + " maxInFlight=" + uploader.maxInFlight.get()
                + " plaintextLeak=" + plaintextLeak());
    }

    private void startClient(FakeUploader.Mode mode) {
        uploader.mode = mode;
        if (analytics != null) analytics.close();
        analytics = SignalLake.start(new SignalLakeConfig.Builder()
                .source(new Source(
                        "app.signallake.stress",
                        "SignalLake-Stress",
                        "signallake-android-demo",
                        "0.1.0",
                        "android",
                        "0.1.0",
                        "click-test"))
                .identity(new Identity("demo-anon", "demo-device"))
                .session("demo-session", "2026-07-08T00:00:00.000Z")
                .eventCatalog(stressCatalog())
                .encryptionKey(new SignalLakeEncryptionKey("demo-local-aes-256-gcm", encryptionKey()))
                .queuePolicy(new SignalLakeQueuePolicy(200, 10, SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST))
                .diskQueue(
                        queueDirectory,
                        new SignalLakeStoragePolicy(
                                1024L * 1024L,
                                40,
                                SignalLakeQueuePolicy.DropPolicy.DROP_OLDEST))
                .uploader(uploader)
                .build());
    }

    private void runInWorker(final Runnable task) {
        setButtonsEnabled(false);
        worker.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    task.run();
                } finally {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            setButtonsEnabled(true);
                        }
                    });
                }
            }
        });
    }

    private void setButtonsEnabled(boolean enabled) {
        offlineButton.setEnabled(enabled);
        slowButton.setEnabled(enabled);
        recoverButton.setEnabled(enabled);
        clearButton.setEnabled(enabled);
    }

    private void postStatus(final String status) {
        writeStatus(status);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                statusView.setText(status);
            }
        });
    }

    private File appStorageRoot() {
        return Build.VERSION.SDK_INT >= 21 ? getNoBackupFilesDir() : getFilesDir();
    }

    private int diskBatchCount() {
        File[] files = queueDirectory.listFiles();
        if (files == null) return 0;
        int count = 0;
        for (int index = 0; index < files.length; index++) {
            if (files[index].isFile() && files[index].getName().endsWith(".batch")) count++;
        }
        return count;
    }

    private long diskBytes() {
        File[] files = queueDirectory.listFiles();
        if (files == null) return 0;
        long bytes = 0;
        for (int index = 0; index < files.length; index++) {
            if (files[index].isFile()) bytes += files[index].length();
        }
        return bytes;
    }

    private boolean plaintextLeak() {
        return directoryContains(queueDirectory, "command.invoked")
                || directoryContains(queueDirectory, "stress.run")
                || directoryContains(queueDirectory, "stress.slow");
    }

    private boolean directoryContains(File directory, String needle) {
        File[] files = directory.listFiles();
        if (files == null) return false;
        for (int index = 0; index < files.length; index++) {
            File file = files[index];
            if (file.isDirectory()) {
                if (directoryContains(file, needle)) return true;
            } else if (readUtf8(file).contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String readUtf8(File file) {
        try {
            byte[] bytes = new byte[(int) file.length()];
            RandomAccessFile input = new RandomAccessFile(file, "r");
            try {
                input.readFully(bytes);
            } finally {
                input.close();
            }
            return new String(bytes, UTF_8);
        } catch (Throwable ignored) {
            return "";
        }
    }

    private void writeStatus(String status) {
        File file = new File(getFilesDir(), "signallake-demo-status.txt");
        try {
            FileOutputStream output = new FileOutputStream(file, false);
            try {
                output.write(status.getBytes(UTF_8));
            } finally {
                output.close();
            }
        } catch (Throwable ignored) {
        }
    }

    private static Map<String, Object> stressProperties() {
        return SignalLakeProperties.builder()
                .outcome(SignalLakeCommonValues.Outcome.SUCCESS)
                .protocol(SignalLakeCommonValues.Protocol.DLNA)
                .build();
    }

    private static SignalLakeEventCatalog stressCatalog() {
        return new SignalLakeEventCatalog(
                "signallake.catalog.stress-demo.v1",
                "SignalLake-Stress",
                "app.signallake.stress",
                SignalLakeEventDefinition.STATUS_ACTIVE,
                Arrays.asList(new SignalLakeEventDefinition(
                        "command.invoked",
                        "command",
                        "behavioral",
                        SignalLakeEventDefinition.STATUS_ACTIVE,
                        Arrays.asList(
                                new SignalLakePropertyDefinition(
                                        SignalLakeCommonFields.COMMAND_ID,
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        true,
                                        Arrays.asList("stress.run", "stress.slow")),
                                new SignalLakePropertyDefinition(
                                        SignalLakeCommonFields.OUTCOME,
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList(SignalLakeCommonValues.Outcome.SUCCESS)),
                                new SignalLakePropertyDefinition(
                                        SignalLakeCommonFields.PROTOCOL,
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList(SignalLakeCommonValues.Protocol.DLNA))))));
    }

    private static byte[] encryptionKey() {
        byte[] key = new byte[32];
        for (int index = 0; index < key.length; index++) key[index] = (byte) (index + 1);
        return key;
    }

    private static String nanosToMs(long nanos) {
        return String.valueOf(nanos / 1000000L);
    }

    private static String sanitize(String value) {
        if (value == null) return "none";
        return value.replace(' ', '_').replace('\n', '_').replace('\r', '_');
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

    private static final class FakeUploader implements EncryptedBatchUploader {
        enum Mode {
            OFFLINE,
            SLOW_SUCCESS,
            SUCCESS
        }

        volatile Mode mode = Mode.SUCCESS;
        final AtomicInteger inFlight = new AtomicInteger();
        final AtomicInteger maxInFlight = new AtomicInteger();
        final AtomicInteger uploadCount = new AtomicInteger();

        @Override
        public UploadResult upload(EncryptedEventBatch batch) {
            int active = inFlight.incrementAndGet();
            maxInFlight.set(Math.max(maxInFlight.get(), active));
            try {
                if (mode == Mode.SLOW_SUCCESS) Thread.sleep(50);
                if (mode == Mode.SUCCESS || mode == Mode.SLOW_SUCCESS) {
                    uploadCount.incrementAndGet();
                    return new UploadResult(true, 202, "accepted");
                }
                return new UploadResult(false, 0, "offline");
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                return new UploadResult(false, 0, "interrupted");
            } finally {
                inFlight.decrementAndGet();
            }
        }

        void reset() {
            inFlight.set(0);
            maxInFlight.set(0);
            uploadCount.set(0);
            mode = Mode.SUCCESS;
        }
    }
}
