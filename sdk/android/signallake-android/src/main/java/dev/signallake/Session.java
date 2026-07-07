package dev.signallake;

public final class Session {
    public final String sessionId;
    public final String startedAt;
    public final long sequence;

    public Session(String sessionId, String startedAt, long sequence) {
        this.sessionId = Require.nonEmpty(sessionId, "session.sessionId");
        this.startedAt = Require.nonEmpty(startedAt, "session.startedAt");
        this.sequence = sequence;
    }
}
