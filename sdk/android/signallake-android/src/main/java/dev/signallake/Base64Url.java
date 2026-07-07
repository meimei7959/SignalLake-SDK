package dev.signallake;

import android.util.Base64;

final class Base64Url {
    private Base64Url() {}

    static String encode(byte[] bytes) {
        return Base64.encodeToString(
                bytes,
                Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }
}
