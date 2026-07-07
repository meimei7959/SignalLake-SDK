package dev.signallake;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;

public final class HttpUrlConnectionEncryptedBatchUploader implements EncryptedBatchUploader {
    private static final Charset UTF_8 = Charset.forName("UTF-8");

    private final String uploadUrl;
    private final String bearerToken;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;

    public HttpUrlConnectionEncryptedBatchUploader(
            String uploadUrl,
            String bearerToken,
            int connectTimeoutMs,
            int readTimeoutMs) {
        this.uploadUrl = Require.nonEmpty(uploadUrl, "uploadUrl");
        this.bearerToken = bearerToken;
        this.connectTimeoutMs = connectTimeoutMs <= 0 ? 5000 : connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs <= 0 ? 5000 : readTimeoutMs;
    }

    @Override
    public UploadResult upload(EncryptedEventBatch batch) {
        HttpURLConnection connection = null;
        try {
            byte[] body = JsonCodec.encryptedBatchToJson(batch).getBytes(UTF_8);
            connection = (HttpURLConnection) new URL(uploadUrl).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(connectTimeoutMs);
            connection.setReadTimeout(readTimeoutMs);
            connection.setDoOutput(true);
            connection.setRequestProperty("content-type", "application/json");
            connection.setRequestProperty("accept", "application/json");
            if (bearerToken != null && bearerToken.length() > 0) {
                connection.setRequestProperty("authorization", "Bearer " + bearerToken);
            }

            OutputStream output = connection.getOutputStream();
            try {
                output.write(body);
            } finally {
                output.close();
            }

            int status = connection.getResponseCode();
            String response = readResponse(connection, status);
            return new UploadResult(status >= 200 && status < 300, status, response);
        } catch (Throwable error) {
            return new UploadResult(false, 0, error.getClass().getSimpleName() + ": " + error.getMessage());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String readResponse(HttpURLConnection connection, int status) throws IOException {
        InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (input == null) return "";
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[512];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                if (output.size() > 4096) break;
            }
            return new String(output.toByteArray(), UTF_8);
        } finally {
            input.close();
        }
    }
}
