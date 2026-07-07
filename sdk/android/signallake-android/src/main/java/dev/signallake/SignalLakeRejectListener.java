package dev.signallake;

public interface SignalLakeRejectListener {
    void onRejected(String eventName, String reason);
}
