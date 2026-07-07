package dev.signallake;

import java.util.Map;
import java.util.concurrent.Future;

public final class NoopSignalLakeClient implements SignalLakeClient {
    @Override
    public void track(String name, String category, Map<String, Object> properties) {}

    @Override
    public void trackAppOpened(Map<String, Object> properties) {}

    @Override
    public void trackScreenViewed(String screenId, Map<String, Object> properties) {}

    @Override
    public void trackCommandInvoked(String commandId, Map<String, Object> properties) {}

    @Override
    public void trackErrorOccurred(String errorCode, Map<String, Object> properties) {}

    @Override
    public Future<FlushResult> flush() {
        return new CompletedFuture<FlushResult>(FlushResult.noop());
    }

    @Override
    public int queuedCount() {
        return 0;
    }

    @Override
    public void close() {}
}
