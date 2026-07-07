package dev.signallake;

public final class Source {
    public final String appId;
    public final String product;
    public final String sdkName;
    public final String sdkVersion;
    public final String platform;
    public final String appVersion;
    public final String environment;

    public Source(
            String appId,
            String product,
            String sdkName,
            String sdkVersion,
            String platform,
            String appVersion,
            String environment) {
        this.appId = Require.nonEmpty(appId, "source.appId");
        this.product = Require.nonEmpty(product, "source.product");
        this.sdkName = Require.nonEmpty(sdkName, "source.sdkName");
        this.sdkVersion = Require.nonEmpty(sdkVersion, "source.sdkVersion");
        this.platform = Require.nonEmpty(platform, "source.platform");
        this.appVersion = appVersion;
        this.environment = Require.nonEmpty(environment, "source.environment");
    }
}
