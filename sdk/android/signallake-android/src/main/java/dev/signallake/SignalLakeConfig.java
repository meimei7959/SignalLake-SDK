package dev.signallake;

public final class SignalLakeConfig {
    public final Source source;
    public final Identity identity;
    public final String sessionId;
    public final String sessionStartedAt;
    public final SignalLakeEventCatalog eventCatalog;
    public final SignalLakeEncryptionKey encryptionKey;
    public final SignalLakeQueuePolicy queuePolicy;
    public final EncryptedBatchUploader uploader;
    public final SignalLakeRejectListener rejectListener;

    private SignalLakeConfig(Builder builder) {
        this.source = Require.notNull(builder.source, "source");
        this.identity = Require.notNull(builder.identity, "identity");
        this.sessionId = Require.nonEmpty(builder.sessionId, "sessionId");
        this.sessionStartedAt = Require.nonEmpty(builder.sessionStartedAt, "sessionStartedAt");
        this.eventCatalog = Require.notNull(builder.eventCatalog, "eventCatalog");
        this.eventCatalog.validateSource(this.source);
        this.encryptionKey = Require.notNull(builder.encryptionKey, "encryptionKey");
        this.queuePolicy = builder.queuePolicy == null
                ? SignalLakeQueuePolicy.androidTvDefault()
                : builder.queuePolicy;
        this.uploader = builder.uploader;
        this.rejectListener = builder.rejectListener;
    }

    public static final class Builder {
        private Source source;
        private Identity identity;
        private String sessionId;
        private String sessionStartedAt;
        private SignalLakeEventCatalog eventCatalog;
        private SignalLakeEncryptionKey encryptionKey;
        private SignalLakeQueuePolicy queuePolicy;
        private EncryptedBatchUploader uploader;
        private SignalLakeRejectListener rejectListener;

        public Builder source(Source source) {
            this.source = source;
            return this;
        }

        public Builder identity(Identity identity) {
            this.identity = identity;
            return this;
        }

        public Builder session(String sessionId, String sessionStartedAt) {
            this.sessionId = sessionId;
            this.sessionStartedAt = sessionStartedAt;
            return this;
        }

        public Builder eventCatalog(SignalLakeEventCatalog eventCatalog) {
            this.eventCatalog = eventCatalog;
            return this;
        }

        public Builder encryptionKey(SignalLakeEncryptionKey encryptionKey) {
            this.encryptionKey = encryptionKey;
            return this;
        }

        public Builder queuePolicy(SignalLakeQueuePolicy queuePolicy) {
            this.queuePolicy = queuePolicy;
            return this;
        }

        public Builder uploader(EncryptedBatchUploader uploader) {
            this.uploader = uploader;
            return this;
        }

        public Builder rejectListener(SignalLakeRejectListener rejectListener) {
            this.rejectListener = rejectListener;
            return this;
        }

        public Builder httpUploader(String uploadUrl, String bearerToken, int connectTimeoutMs, int readTimeoutMs) {
            this.uploader = new HttpUrlConnectionEncryptedBatchUploader(
                    uploadUrl,
                    bearerToken,
                    connectTimeoutMs,
                    readTimeoutMs);
            return this;
        }

        public SignalLakeConfig build() {
            return new SignalLakeConfig(this);
        }
    }
}
