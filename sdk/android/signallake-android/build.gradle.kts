plugins {
    id("com.android.library")
}

android {
    namespace = "dev.signallake"
    compileSdk = 35

    defaultConfig {
        minSdk = 19
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}

dependencies {
    androidTestImplementation("junit:junit:4.13.2")
}
