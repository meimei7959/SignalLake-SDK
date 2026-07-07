package dev.signallake;

final class Require {
    private Require() {}

    static String nonEmpty(String value, String name) {
        if (value == null || value.length() == 0) {
            throw new IllegalArgumentException(name + " must be non-empty");
        }
        return value;
    }

    static <T> T notNull(T value, String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + " must not be null");
        }
        return value;
    }
}
