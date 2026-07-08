plugins {
    id("com.android.application")
}

android {
    namespace = "dev.signallake.demo"
    compileSdk = 35

    defaultConfig {
        applicationId = "dev.signallake.demo"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }
}

dependencies {
    implementation(project(":signallake-android"))
}
