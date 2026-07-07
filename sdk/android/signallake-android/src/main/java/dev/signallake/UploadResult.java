package dev.signallake;

public final class UploadResult {
    public final boolean ok;
    public final int statusCode;
    public final String message;

    public UploadResult(boolean ok, int statusCode, String message) {
        this.ok = ok;
        this.statusCode = statusCode;
        this.message = message;
    }
}
