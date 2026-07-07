package dev.signallake;

import java.util.Map;
import java.util.regex.Pattern;

final class CommonPropertyValidator {
    private static final Pattern PROPERTY_NAME = Pattern.compile("^[a-z][a-zA-Z0-9_]{0,63}$");
    private static final Pattern CHANNEL_ID = Pattern.compile("^[a-z][a-z0-9._-]{0,63}$");
    private static final Pattern BUILD_ID = Pattern.compile("^[A-Za-z0-9._:-]{1,80}$");
    private static final Pattern LOCALE = Pattern.compile("^[A-Za-z]{2,8}([_-][A-Za-z0-9]{2,8})*$");
    private static final Pattern TIMEZONE = Pattern.compile("^[A-Za-z0-9_+./:-]{1,64}$");
    private static final Pattern OS_VERSION = Pattern.compile("^[A-Za-z0-9._ -]{1,40}$");
    private static final Pattern ERROR_CODE = Pattern.compile("^[A-Z][A-Z0-9_]{1,63}$");
    private static final Pattern DOTTED_ID = Pattern.compile("^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$");
    private static final Pattern LOWER_ID = Pattern.compile("^[a-z][a-z0-9._-]{0,63}$");

    private CommonPropertyValidator() {}

    static void assertValid(Map<String, Object> properties) {
        if (properties == null) return;
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            assertValid(entry.getKey(), entry.getValue());
        }
    }

    static void assertValid(String name, Object value) {
        if (!PROPERTY_NAME.matcher(Require.nonEmpty(name, "property.name")).matches()) {
            throw new IllegalArgumentException(name + " must use camelCase property naming");
        }
        if (value == null) return;
        if (SignalLakeCommonFields.CHANNEL_ID.equals(name)) requireStringPattern(name, value, CHANNEL_ID, 64);
        else if (SignalLakeCommonFields.CHANNEL_NAME.equals(name)) requireStringMax(name, value, 64);
        else if (SignalLakeCommonFields.BUILD_ID.equals(name)) requireStringPattern(name, value, BUILD_ID, 80);
        else if (SignalLakeCommonFields.VERSION_CODE.equals(name)) requireNonNegativeInteger(name, value);
        else if (SignalLakeCommonFields.DISTRIBUTION.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.Distribution.OFFICIAL,
                SignalLakeCommonValues.Distribution.APP_STORE,
                SignalLakeCommonValues.Distribution.ENTERPRISE,
                SignalLakeCommonValues.Distribution.INTERNAL,
                SignalLakeCommonValues.Distribution.TEST,
                SignalLakeCommonValues.Distribution.UNKNOWN);
        else if (SignalLakeCommonFields.LOCALE.equals(name)) requireStringPattern(name, value, LOCALE, 35);
        else if (SignalLakeCommonFields.TIMEZONE.equals(name)) requireStringPattern(name, value, TIMEZONE, 64);
        else if (SignalLakeCommonFields.NETWORK_TYPE.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.NetworkType.WIFI,
                SignalLakeCommonValues.NetworkType.ETHERNET,
                SignalLakeCommonValues.NetworkType.CELLULAR,
                SignalLakeCommonValues.NetworkType.OFFLINE,
                SignalLakeCommonValues.NetworkType.UNKNOWN);
        else if (SignalLakeCommonFields.DEVICE_TIER.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.DeviceTier.LOW,
                SignalLakeCommonValues.DeviceTier.MID,
                SignalLakeCommonValues.DeviceTier.HIGH,
                SignalLakeCommonValues.DeviceTier.UNKNOWN);
        else if (SignalLakeCommonFields.OS_VERSION.equals(name)) requireStringPattern(name, value, OS_VERSION, 40);
        else if (SignalLakeCommonFields.APP_FOREGROUND.equals(name)) requireBoolean(name, value);
        else if (SignalLakeCommonFields.SESSION_DURATION_BUCKET.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.SessionDurationBucket.UNDER_10S,
                SignalLakeCommonValues.SessionDurationBucket.S10_TO_30S,
                SignalLakeCommonValues.SessionDurationBucket.S30_TO_60S,
                SignalLakeCommonValues.SessionDurationBucket.M1_TO_5M,
                SignalLakeCommonValues.SessionDurationBucket.M5_TO_30M,
                SignalLakeCommonValues.SessionDurationBucket.M30_PLUS,
                SignalLakeCommonValues.SessionDurationBucket.UNKNOWN);
        else if (SignalLakeCommonFields.DURATION_BUCKET.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.DurationBucket.UNDER_1S,
                SignalLakeCommonValues.DurationBucket.S1_TO_3S,
                SignalLakeCommonValues.DurationBucket.S3_TO_10S,
                SignalLakeCommonValues.DurationBucket.S10_TO_30S,
                SignalLakeCommonValues.DurationBucket.S30_TO_60S,
                SignalLakeCommonValues.DurationBucket.M1_TO_5M,
                SignalLakeCommonValues.DurationBucket.M5_PLUS,
                SignalLakeCommonValues.DurationBucket.UNKNOWN);
        else if (SignalLakeCommonFields.OUTCOME.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.Outcome.SUCCESS,
                SignalLakeCommonValues.Outcome.FAILURE,
                SignalLakeCommonValues.Outcome.CANCELLED,
                SignalLakeCommonValues.Outcome.SKIPPED,
                SignalLakeCommonValues.Outcome.UNKNOWN);
        else if (SignalLakeCommonFields.ERROR_CODE.equals(name)) requireStringPattern(name, value, ERROR_CODE, 64);
        else if (SignalLakeCommonFields.SCREEN_ID.equals(name)) requireStringPattern(name, value, DOTTED_ID, 96);
        else if (SignalLakeCommonFields.COMMAND_ID.equals(name)) requireStringPattern(name, value, DOTTED_ID, 96);
        else if (SignalLakeCommonFields.PROTOCOL.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.Protocol.DLNA,
                SignalLakeCommonValues.Protocol.AIRPLAY,
                SignalLakeCommonValues.Protocol.MIRACAST,
                SignalLakeCommonValues.Protocol.CHROMECAST,
                SignalLakeCommonValues.Protocol.LOCAL,
                SignalLakeCommonValues.Protocol.UNKNOWN);
        else if (SignalLakeCommonFields.PLAYER_BACKEND.equals(name)) requireStringPattern(name, value, LOWER_ID, 64);
        else if (SignalLakeCommonFields.MEDIA_KIND.equals(name)) requireOneOf(name, value,
                SignalLakeCommonValues.MediaKind.IMAGE,
                SignalLakeCommonValues.MediaKind.VIDEO,
                SignalLakeCommonValues.MediaKind.AUDIO,
                SignalLakeCommonValues.MediaKind.LIVE,
                SignalLakeCommonValues.MediaKind.DOCUMENT,
                SignalLakeCommonValues.MediaKind.UNKNOWN);
    }

    private static void requireStringMax(String name, Object value, int maxLength) {
        if (!(value instanceof String)) throw new IllegalArgumentException(name + " must be a string");
        if (((String) value).length() > maxLength) {
            throw new IllegalArgumentException(name + " must be <= " + maxLength + " chars");
        }
    }

    private static void requireStringPattern(String name, Object value, Pattern pattern, int maxLength) {
        requireStringMax(name, value, maxLength);
        if (!pattern.matcher((String) value).matches()) {
            throw new IllegalArgumentException(name + " has invalid format");
        }
    }

    private static void requireNonNegativeInteger(String name, Object value) {
        if (!(value instanceof Integer) && !(value instanceof Long)) {
            throw new IllegalArgumentException(name + " must be an integer");
        }
        long number = value instanceof Integer ? ((Integer) value).longValue() : ((Long) value).longValue();
        if (number < 0) throw new IllegalArgumentException(name + " must be >= 0");
    }

    private static void requireBoolean(String name, Object value) {
        if (!(value instanceof Boolean)) throw new IllegalArgumentException(name + " must be a boolean");
    }

    private static void requireOneOf(String name, Object value, String... allowed) {
        if (!(value instanceof String)) throw new IllegalArgumentException(name + " must be a string");
        String text = (String) value;
        for (String candidate : allowed) {
            if (candidate.equals(text)) return;
        }
        throw new IllegalArgumentException(name + " has unsupported value");
    }
}
