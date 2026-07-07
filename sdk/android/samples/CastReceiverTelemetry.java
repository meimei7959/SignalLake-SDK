package dev.signallake.samples;

import dev.signallake.Identity;
import dev.signallake.SignalLake;
import dev.signallake.SignalLakeClient;
import dev.signallake.SignalLakeCommonValues;
import dev.signallake.SignalLakeConfig;
import dev.signallake.SignalLakeDebugKeyProvider;
import dev.signallake.SignalLakeEventCatalog;
import dev.signallake.SignalLakeEventDefinition;
import dev.signallake.SignalLakeKeyProvider;
import dev.signallake.SignalLakePropertyDefinition;
import dev.signallake.SignalLakeProperties;
import dev.signallake.SignalLakeQueuePolicy;
import dev.signallake.Source;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.UUID;

public final class CastReceiverTelemetry {
    private volatile SignalLakeClient analytics = SignalLake.noop();

    public void onPrivacyAccepted(
            String appVersion,
            String installId,
            byte[] runtimeKey,
            boolean debugBuild,
            String relayToken,
            String uploadUrl) throws Exception {
        SignalLakeKeyProvider keyProvider = new SignalLakeDebugKeyProvider(
                "debug-cast-receiver-current",
                runtimeKey,
                debugBuild);
        SignalLakeConfig.Builder configBuilder = new SignalLakeConfig.Builder()
                .source(new Source(
                        "com.zknowai.labi.cast.receiver",
                        "Cast-SDK",
                        "signallake-android",
                        "0.1.0",
                        "android-tv",
                        appVersion,
                        "prod"))
                .identity(new Identity(installId, installId))
                .session(UUID.randomUUID().toString(), isoNow())
                .eventCatalog(castReceiverCatalog())
                .queuePolicy(SignalLakeQueuePolicy.androidTvDefault())
                .httpUploader(uploadUrl, relayToken, 5000, 5000);
        analytics = SignalLake.startWithKeyProvider(configBuilder, keyProvider);
    }

    public void trackPlayerStart(String outcome, String channelId, String buildId) {
        Map<String, Object> props = SignalLakeProperties.builder()
                .protocol(SignalLakeCommonValues.Protocol.DLNA)
                .playerBackend("system")
                .mediaKind(SignalLakeCommonValues.MediaKind.IMAGE)
                .outcome(outcome)
                .channel(channelId)
                .buildId(buildId)
                .build();
        analytics.trackCommandInvoked("player.start", props);
    }

    public void flush() {
        analytics.flush();
    }

    private static String isoNow() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    private static SignalLakeEventCatalog castReceiverCatalog() {
        return new SignalLakeEventCatalog(
                "signallake.catalog.cast-sdk.receiver.v1",
                "Cast-SDK",
                "com.zknowai.labi.cast.receiver",
                SignalLakeEventDefinition.STATUS_ACTIVE,
                Arrays.asList(new SignalLakeEventDefinition(
                        "command.invoked",
                        "command",
                        "behavioral",
                        SignalLakeEventDefinition.STATUS_ACTIVE,
                        Arrays.asList(
                                new SignalLakePropertyDefinition(
                                        "commandId",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        true,
                                        Arrays.asList("player.start", "player.stop", "receiver.ready")),
                                new SignalLakePropertyDefinition(
                                        "protocol",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList("dlna", "local", "unknown")),
                                new SignalLakePropertyDefinition(
                                        "playerBackend",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        null),
                                new SignalLakePropertyDefinition(
                                        "mediaKind",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList("image", "video", "audio", "unknown")),
                                new SignalLakePropertyDefinition(
                                        "outcome",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        Arrays.asList("success", "failure", "unknown")),
                                new SignalLakePropertyDefinition(
                                        "channelId",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        null),
                                new SignalLakePropertyDefinition(
                                        "buildId",
                                        SignalLakePropertyDefinition.TYPE_STRING,
                                        SignalLakePropertyDefinition.SCOPE_COMMON,
                                        false,
                                        null))));
    }
}
