package dev.signallake;

public final class Identity {
    public final String anonymousId;
    public final String deviceId;
    public final String userId;

    public Identity(String anonymousId, String deviceId) {
        this(anonymousId, deviceId, null);
    }

    public Identity(String anonymousId, String deviceId, String userId) {
        this.anonymousId = Require.nonEmpty(anonymousId, "identity.anonymousId");
        this.deviceId = Require.nonEmpty(deviceId, "identity.deviceId");
        this.userId = userId;
    }
}
