package dev.signallake;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public final class PrivacyGuard {
    private static final String[] FORBIDDEN_NAME_TERMS = {
            "url",
            "uri",
            "filepath",
            "filename",
            "file_path",
            "file_name",
            "folderpath",
            "foldername",
            "folder_path",
            "folder_name",
            "path",
            "title",
            "metadata",
            "raw",
            "ip",
            "mac",
            "ssid",
            "bssid",
            "imei",
            "androidid",
            "android_id",
            "token",
            "secret",
            "password",
            "email",
            "phone",
            "clipboard"
    };

    private static final Pattern UNIX_ABSOLUTE_PATH = Pattern.compile("^/[A-Za-z0-9_./ -]+$");
    private static final Pattern WINDOWS_ABSOLUTE_PATH = Pattern.compile("^[A-Za-z]:\\\\.*");
    private static final Pattern HTTP_URL = Pattern.compile("^[a-zA-Z][a-zA-Z0-9+.-]*://.*");
    private static final Pattern IPV4 = Pattern.compile("^(?:\\d{1,3}\\.){3}\\d{1,3}$");
    private static final Pattern MAC = Pattern.compile("(?i)^([0-9a-f]{2}:){5}[0-9a-f]{2}$");

    private PrivacyGuard() {}

    public static void assertSafe(Map<String, Object> properties) {
        if (properties == null) return;
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            assertSafeName(entry.getKey());
            assertSafeValue(entry.getKey(), entry.getValue());
        }
    }

    private static void assertSafeName(String name) {
        String lower = String.valueOf(name).toLowerCase(Locale.US);
        for (String term : FORBIDDEN_NAME_TERMS) {
            if (lower.contains(term)) {
                throw new SignalLakePrivacyException(
                        "SignalLake privacy violation: event.properties." + name + ": forbidden property name");
            }
        }
    }

    private static void assertSafeValue(String name, Object value) {
        if (value == null) return;
        if (value instanceof String) {
            String text = (String) value;
            if (UNIX_ABSOLUTE_PATH.matcher(text).matches()
                    || WINDOWS_ABSOLUTE_PATH.matcher(text).matches()
                    || HTTP_URL.matcher(text).matches()
                    || IPV4.matcher(text).matches()
                    || MAC.matcher(text).matches()) {
                throw new SignalLakePrivacyException(
                        "SignalLake privacy violation: event.properties." + name + ": forbidden property value");
            }
        } else if (!(value instanceof Number) && !(value instanceof Boolean)) {
            throw new SignalLakePrivacyException(
                    "SignalLake privacy violation: event.properties." + name + ": unsupported property value type");
        }
    }
}
