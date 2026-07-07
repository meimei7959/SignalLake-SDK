package dev.signallake;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import java.util.Locale;
import java.util.TimeZone;

public final class SignalLakeAndroidContext {
    private SignalLakeAndroidContext() {}

    public static Source source(
            Context context,
            String product,
            String sdkVersion,
            String platform,
            String environment) {
        return new Source(
                appId(context),
                product,
                "signallake-android",
                sdkVersion,
                platform,
                appVersion(context),
                environment);
    }

    public static SignalLakeProperties.Builder commonProperties(Context context) {
        return SignalLakeProperties.builder()
                .versionCode(versionCode(context))
                .locale(locale(context))
                .timezone(timezone())
                .osVersion(osVersion());
    }

    public static String appId(Context context) {
        return Require.notNull(context, "context").getPackageName();
    }

    public static String appVersion(Context context) {
        PackageInfo info = packageInfo(context);
        if (info.versionName != null && info.versionName.length() > 0) return info.versionName;
        return String.valueOf(versionCode(context));
    }

    public static long versionCode(Context context) {
        PackageInfo info = packageInfo(context);
        if (Build.VERSION.SDK_INT >= 28) return info.getLongVersionCode();
        return info.versionCode;
    }

    @SuppressWarnings("deprecation")
    public static String locale(Context context) {
        Locale locale;
        if (Build.VERSION.SDK_INT >= 24) {
            locale = Require.notNull(context, "context")
                    .getResources()
                    .getConfiguration()
                    .getLocales()
                    .get(0);
        } else {
            locale = Require.notNull(context, "context")
                    .getResources()
                    .getConfiguration()
                    .locale;
        }
        return locale == null ? "unknown" : locale.toString();
    }

    public static String timezone() {
        String id = TimeZone.getDefault().getID();
        return id == null || id.length() == 0 ? "unknown" : id;
    }

    public static String osVersion() {
        return Build.VERSION.RELEASE == null || Build.VERSION.RELEASE.length() == 0
                ? String.valueOf(Build.VERSION.SDK_INT)
                : Build.VERSION.RELEASE;
    }

    private static PackageInfo packageInfo(Context context) {
        try {
            Context safeContext = Require.notNull(context, "context");
            return safeContext.getPackageManager().getPackageInfo(safeContext.getPackageName(), 0);
        } catch (PackageManager.NameNotFoundException error) {
            throw new IllegalStateException("host package info unavailable", error);
        }
    }
}
