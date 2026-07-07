package dev.signallake;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.FutureTask;

public final class SignalLake {
    private SignalLake() {}

    public static SignalLakeClient noop() {
        return new NoopSignalLakeClient();
    }

    public static SignalLakeClient start(SignalLakeConfig config) {
        Require.notNull(Require.notNull(config, "config").encryptionKey, "encryptionKey");
        return new RealSignalLakeClient(config);
    }

    public static SignalLakeClient startWithKeyProvider(
            SignalLakeConfig.Builder configBuilder,
            SignalLakeKeyProvider keyProvider) throws Exception {
        SignalLakeEncryptionKey key = Require.notNull(keyProvider, "keyProvider").getEncryptionKey();
        return start(Require.notNull(configBuilder, "configBuilder").encryptionKey(key).build());
    }

    public static Future<SignalLakeClient> startAsync(
            final SignalLakeConfig.Builder configBuilder,
            final SignalLakeKeyProvider keyProvider) {
        final ExecutorService executor = Executors.newSingleThreadExecutor();
        FutureTask<SignalLakeClient> task = new FutureTask<SignalLakeClient>(
                new Callable<SignalLakeClient>() {
                    @Override
                    public SignalLakeClient call() throws Exception {
                        try {
                            return startWithKeyProvider(configBuilder, keyProvider);
                        } finally {
                            executor.shutdown();
                        }
                    }
                });
        executor.execute(task);
        return task;
    }
}
