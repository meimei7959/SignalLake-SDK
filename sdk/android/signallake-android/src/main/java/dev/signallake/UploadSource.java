package dev.signallake;

public final class UploadSource {
    public final String appId;
    public final String product;
    public final String sdkName;
    public final String sdkVersion;
    public final String environment;

    public UploadSource(String appId, String product, String sdkName, String sdkVersion, String environment) {
        this.appId = Require.nonEmpty(appId, "source.appId");
        this.product = Require.nonEmpty(product, "source.product");
        this.sdkName = Require.nonEmpty(sdkName, "source.sdkName");
        this.sdkVersion = Require.nonEmpty(sdkVersion, "source.sdkVersion");
        this.environment = Require.nonEmpty(environment, "source.environment");
    }
}
