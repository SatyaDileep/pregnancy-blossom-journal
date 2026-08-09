plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.blossom.blossom_journal"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.blossom.blossom_journal"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            // Populated only in CI (GitHub Actions exports JKS_PATH etc.).
            // Locally these env vars are unset, so the config is inert and
            // builds keep using debug signing exactly as before.
            val jksPath = System.getenv("JKS_PATH")
            if (jksPath != null) {
                storeFile = file(jksPath)
                storePassword = System.getenv("JKS_PASS") ?: "journal2026"
                keyAlias = System.getenv("JKS_ALIAS") ?: "journal"
                keyPassword = System.getenv("JKS_PASS") ?: "journal2026"
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (System.getenv("JKS_PATH") != null) {
                signingConfigs.getByName("release")
            } else {
                // Signing with the debug keys for now, so `flutter run --release` works.
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
