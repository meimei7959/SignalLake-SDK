package dev.signallake;

import java.util.Map;
import java.util.concurrent.Future;

public interface SignalLakeClient {
    void track(String name, String category, Map<String, Object> properties);
    void trackAppOpened(Map<String, Object> properties);
    void trackScreenViewed(String screenId, Map<String, Object> properties);
    void trackCommandInvoked(String commandId, Map<String, Object> properties);
    void trackErrorOccurred(String errorCode, Map<String, Object> properties);
    Future<FlushResult> flush();
    int queuedCount();
    void close();
}
