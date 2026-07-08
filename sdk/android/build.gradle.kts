plugins {
    id("com.android.library") version "8.5.2" apply false
    id("com.android.application") version "8.5.2" apply false
}

group = "dev.signallake"
version = "0.1.0"

subprojects {
    group = rootProject.group
    version = rootProject.version
}
