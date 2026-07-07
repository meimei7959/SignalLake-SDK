package dev.signallake;

public final class SignalLakeCommonValues {
    private SignalLakeCommonValues() {}

    public static final class Distribution {
        public static final String OFFICIAL = "official";
        public static final String APP_STORE = "app-store";
        public static final String ENTERPRISE = "enterprise";
        public static final String INTERNAL = "internal";
        public static final String TEST = "test";
        public static final String UNKNOWN = "unknown";

        private Distribution() {}
    }

    public static final class NetworkType {
        public static final String WIFI = "wifi";
        public static final String ETHERNET = "ethernet";
        public static final String CELLULAR = "cellular";
        public static final String OFFLINE = "offline";
        public static final String UNKNOWN = "unknown";

        private NetworkType() {}
    }

    public static final class DeviceTier {
        public static final String LOW = "low";
        public static final String MID = "mid";
        public static final String HIGH = "high";
        public static final String UNKNOWN = "unknown";

        private DeviceTier() {}
    }

    public static final class SessionDurationBucket {
        public static final String UNDER_10S = "0_10s";
        public static final String S10_TO_30S = "10_30s";
        public static final String S30_TO_60S = "30_60s";
        public static final String M1_TO_5M = "1_5m";
        public static final String M5_TO_30M = "5_30m";
        public static final String M30_PLUS = "30m_plus";
        public static final String UNKNOWN = "unknown";

        private SessionDurationBucket() {}
    }

    public static final class DurationBucket {
        public static final String UNDER_1S = "0_1s";
        public static final String S1_TO_3S = "1_3s";
        public static final String S3_TO_10S = "3_10s";
        public static final String S10_TO_30S = "10_30s";
        public static final String S30_TO_60S = "30_60s";
        public static final String M1_TO_5M = "1_5m";
        public static final String M5_PLUS = "5m_plus";
        public static final String UNKNOWN = "unknown";

        private DurationBucket() {}
    }

    public static final class Outcome {
        public static final String SUCCESS = "success";
        public static final String FAILURE = "failure";
        public static final String CANCELLED = "cancelled";
        public static final String SKIPPED = "skipped";
        public static final String UNKNOWN = "unknown";

        private Outcome() {}
    }

    public static final class Protocol {
        public static final String DLNA = "dlna";
        public static final String AIRPLAY = "airplay";
        public static final String MIRACAST = "miracast";
        public static final String CHROMECAST = "chromecast";
        public static final String LOCAL = "local";
        public static final String UNKNOWN = "unknown";

        private Protocol() {}
    }

    public static final class MediaKind {
        public static final String IMAGE = "image";
        public static final String VIDEO = "video";
        public static final String AUDIO = "audio";
        public static final String LIVE = "live";
        public static final String DOCUMENT = "document";
        public static final String UNKNOWN = "unknown";

        private MediaKind() {}
    }
}
