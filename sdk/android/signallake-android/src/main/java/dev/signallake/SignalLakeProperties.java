package dev.signallake;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public final class SignalLakeProperties {
    private SignalLakeProperties() {}

    public static Builder builder() {
        return new Builder();
    }

    public static Builder from(Map<String, Object> properties) {
        Builder builder = new Builder();
        if (properties != null) {
            for (Map.Entry<String, Object> entry : properties.entrySet()) {
                builder.put(entry.getKey(), entry.getValue());
            }
        }
        return builder;
    }

    public static final class Builder {
        private final LinkedHashMap<String, Object> properties = new LinkedHashMap<String, Object>();

        public Builder channel(String channelId) {
            return put(SignalLakeCommonFields.CHANNEL_ID, channelId);
        }

        public Builder channel(String channelId, String channelName) {
            put(SignalLakeCommonFields.CHANNEL_ID, channelId);
            return put(SignalLakeCommonFields.CHANNEL_NAME, channelName);
        }

        public Builder buildId(String buildId) {
            return put(SignalLakeCommonFields.BUILD_ID, buildId);
        }

        public Builder versionCode(long versionCode) {
            return put(SignalLakeCommonFields.VERSION_CODE, Long.valueOf(versionCode));
        }

        public Builder distribution(String distribution) {
            return put(SignalLakeCommonFields.DISTRIBUTION, distribution);
        }

        public Builder locale(String locale) {
            return put(SignalLakeCommonFields.LOCALE, locale);
        }

        public Builder timezone(String timezone) {
            return put(SignalLakeCommonFields.TIMEZONE, timezone);
        }

        public Builder networkType(String networkType) {
            return put(SignalLakeCommonFields.NETWORK_TYPE, networkType);
        }

        public Builder deviceTier(String deviceTier) {
            return put(SignalLakeCommonFields.DEVICE_TIER, deviceTier);
        }

        public Builder osVersion(String osVersion) {
            return put(SignalLakeCommonFields.OS_VERSION, osVersion);
        }

        public Builder appForeground(boolean appForeground) {
            return put(SignalLakeCommonFields.APP_FOREGROUND, Boolean.valueOf(appForeground));
        }

        public Builder sessionDurationBucket(String bucket) {
            return put(SignalLakeCommonFields.SESSION_DURATION_BUCKET, bucket);
        }

        public Builder durationBucket(String bucket) {
            return put(SignalLakeCommonFields.DURATION_BUCKET, bucket);
        }

        public Builder outcome(String outcome) {
            return put(SignalLakeCommonFields.OUTCOME, outcome);
        }

        public Builder errorCode(String errorCode) {
            return put(SignalLakeCommonFields.ERROR_CODE, errorCode);
        }

        public Builder screenId(String screenId) {
            return put(SignalLakeCommonFields.SCREEN_ID, screenId);
        }

        public Builder commandId(String commandId) {
            return put(SignalLakeCommonFields.COMMAND_ID, commandId);
        }

        public Builder protocol(String protocol) {
            return put(SignalLakeCommonFields.PROTOCOL, protocol);
        }

        public Builder playerBackend(String playerBackend) {
            return put(SignalLakeCommonFields.PLAYER_BACKEND, playerBackend);
        }

        public Builder mediaKind(String mediaKind) {
            return put(SignalLakeCommonFields.MEDIA_KIND, mediaKind);
        }

        public Builder putProductField(String name, Object value) {
            return put(name, value);
        }

        public Builder put(String name, Object value) {
            Require.nonEmpty(name, "property.name");
            if (value == null) {
                properties.put(name, null);
                return this;
            }
            if (!(value instanceof String)
                    && !(value instanceof Number)
                    && !(value instanceof Boolean)) {
                throw new IllegalArgumentException("event property " + name + " has unsupported value type");
            }
            CommonPropertyValidator.assertValid(name, value);
            LinkedHashMap<String, Object> candidate = new LinkedHashMap<String, Object>(properties);
            candidate.put(name, value);
            PrivacyGuard.assertSafe(candidate);
            properties.put(name, value);
            return this;
        }

        public Map<String, Object> build() {
            CommonPropertyValidator.assertValid(properties);
            PrivacyGuard.assertSafe(properties);
            return Collections.unmodifiableMap(new LinkedHashMap<String, Object>(properties));
        }
    }
}
